import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { customAlphabet } from 'nanoid'
import { CaboGame } from './engine/game'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@cabo/shared'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)

const app = express()
app.use(cors())
app.get('/health', (_req, res) => res.json({ ok: true }))

const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
})

// ─── Room storage ─────────────────────────────────────────────────────────────
// roomId → CaboGame
const rooms = new Map<string, CaboGame>()

// socketId → { roomId, playerId (the canonical id = socket id at join time) }
const socketRoom = new Map<string, { roomId: string; canonicalId: string }>()

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function broadcastView(game: CaboGame) {
  for (const player of game.state.players) {
    const view = game.getViewForPlayer(player.id)
    io.to(player.id).emit('game:view', view)
  }
}

function broadcastRoomInfo(game: CaboGame) {
  const info = {
    roomId: game.state.roomId,
    players: game.state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === game.state.hostId,
      isReady: p.isReady,
      isConnected: p.isConnected,
    })),
  }
  for (const player of game.state.players) {
    io.to(player.id).emit('room:info', info)
  }
}

// ─── Socket handlers ──────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('connected:', socket.id)

  // ── Create room ────────────────────────────────────────────────────────────
  socket.on('room:create', ({ playerName }, cb) => {
    const roomId = nanoid()
    const game = new CaboGame(roomId, socket.id, playerName)
    rooms.set(roomId, game)
    socket.join(roomId)
    socketRoom.set(socket.id, { roomId, canonicalId: socket.id })
    cb({ ok: true, roomId, playerId: socket.id })
    broadcastRoomInfo(game)
  })

  // ── Join room ──────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, playerName, playerId }, cb) => {
    const game = rooms.get(roomId)
    if (!game) { cb({ ok: false, error: 'Room not found' }); return }

    // Reconnect path
    if (playerId) {
      const reconnected = game.reconnectPlayer(playerId, socket.id)
      if (reconnected) {
        socket.join(roomId)
        socketRoom.set(socket.id, { roomId, canonicalId: socket.id })
        cb({ ok: true, playerId: socket.id })
        broadcastRoomInfo(game)
        broadcastView(game)
        return
      }
    }

    const result = game.addPlayer(socket.id, playerName)
    if (!result.ok) { cb({ ok: false, error: result.error }); return }
    socket.join(roomId)
    socketRoom.set(socket.id, { roomId, canonicalId: socket.id })
    cb({ ok: true, playerId: socket.id })
    broadcastRoomInfo(game)
  })

  // ── Ready toggle ───────────────────────────────────────────────────────────
  socket.on('game:ready', (cb) => {
    const meta = socketRoom.get(socket.id)
    if (!meta) { cb({ ok: false, error: 'Not in a room' }); return }
    const game = rooms.get(meta.roomId)!
    const result = game.setReady(socket.id)
    cb(result)
    broadcastRoomInfo(game)
  })

  // ── Start game ─────────────────────────────────────────────────────────────
  socket.on('game:start', (cb) => {
    const meta = socketRoom.get(socket.id)
    if (!meta) { cb({ ok: false, error: 'Not in a room' }); return }
    const game = rooms.get(meta.roomId)!
    const result = game.startGame(socket.id)
    cb(result)
    if (result.ok) broadcastView(game)
  })

  // ── Initial peek done ──────────────────────────────────────────────────────
  socket.on('game:initial-peek-done', () => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    game.confirmInitialPeek(socket.id)
    broadcastView(game)
  })

  // ── Draw from deck ─────────────────────────────────────────────────────────
  socket.on('game:draw-deck', () => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const reshuffled = game.ensureDeckHasCards()
    if (reshuffled) {
      io.to(meta.roomId).emit('game:toast', 'Deck exhausted — discard pile reshuffled into deck.')
    }
    const result = game.drawFromDeck(socket.id)
    if (!result.ok) { socket.emit('game:error', result.error!); return }
    broadcastView(game)
  })

  // ── Draw from discard ──────────────────────────────────────────────────────
  socket.on('game:draw-discard', () => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const result = game.drawFromDiscard(socket.id)
    if (!result.ok) { socket.emit('game:error', result.error!); return }
    broadcastView(game)
  })

  // ── Discard drawn card ─────────────────────────────────────────────────────
  socket.on('game:discard-drawn', () => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const result = game.discardDrawn(socket.id)
    if (!result.ok) { socket.emit('game:error', result.error!); return }
    if (result.discardedCard) {
      const player = game.getPlayerById(socket.id)
      const { rank, suit } = result.discardedCard
      const suitSymbol: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
      io.to(meta.roomId).emit('game:toast', `${player?.name ?? 'Someone'} discarded ${rank}${suit ? suitSymbol[suit] : ''}`)
    }
    broadcastView(game)
    if (game.state.phase === 'ability') {
      socket.emit('game:toast', `Special card! Use your ${game.state.pendingAbility?.type} ability or skip.`)
    }
  })

  // ── Swap drawn card ────────────────────────────────────────────────────────
  socket.on('game:swap', (cardIndex) => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const result = game.swap(socket.id, cardIndex)
    if (!result.ok) { socket.emit('game:error', result.error!); return }
    if (result.discardedCard) {
      const player = game.getPlayerById(socket.id)
      const { rank, suit } = result.discardedCard
      const suitSymbol: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
      io.to(meta.roomId).emit('game:toast', `${player?.name ?? 'Someone'} swapped & discarded ${rank}${suit ? suitSymbol[suit] : ''}`)
    }
    broadcastView(game)
  })

  // ── Call Cabo ──────────────────────────────────────────────────────────────
  socket.on('game:cabo', () => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const result = game.callCabo(socket.id)
    if (!result.ok) { socket.emit('game:error', result.error!); return }
    const caller = game.getPlayerById(socket.id)
    io.to(meta.roomId).emit('game:toast', `${caller?.name ?? 'Someone'} called CABO! One last round!`)
    broadcastView(game)
  })

  // ── Use ability ────────────────────────────────────────────────────────────
  socket.on('game:use-ability', (payload) => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const result = game.useAbility(socket.id, payload)
    if (!result.ok) { socket.emit('game:error', result.error!); return }
    if (result.peekResult) {
      socket.emit('game:peek-result', result.peekResult)
    }
    broadcastView(game)
  })

  // ── Skip ability ───────────────────────────────────────────────────────────
  socket.on('game:skip-ability', () => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const result = game.skipAbility(socket.id)
    if (!result.ok) { socket.emit('game:error', result.error!); return }
    broadcastView(game)
  })

  // ── Snap ───────────────────────────────────────────────────────────────────
  socket.on('game:snap', (cardIndex) => {
    const meta = socketRoom.get(socket.id)
    if (!meta) return
    const game = rooms.get(meta.roomId)!
    const snapper = game.getPlayerById(socket.id)
    const result = game.snap(socket.id, cardIndex)
    if (!result.ok) {
      socket.emit('game:error', result.error!)
      if (result.reshuffled) {
        io.to(meta.roomId).emit('game:toast', 'Deck exhausted — discard pile reshuffled into deck.')
      }
      broadcastView(game)
      return
    }
    io.to(meta.roomId).emit('game:toast', `${snapper?.name ?? 'Someone'} snapped a card!`)
    broadcastView(game)
  })

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('disconnected:', socket.id)
    const meta = socketRoom.get(socket.id)
    if (meta) {
      const game = rooms.get(meta.roomId)
      if (game) {
        game.markDisconnected(socket.id)
        broadcastRoomInfo(game)
      }
      socketRoom.delete(socket.id)
    }
  })
})

const PORT = parseInt(process.env.PORT ?? '3001', 10)
httpServer.listen(PORT, () => console.log(`Cabo server listening on :${PORT}`))
