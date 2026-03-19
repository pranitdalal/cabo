import type {
  CardData,
  CardView,
  GamePhase,
  GameView,
  PlayerView,
  PendingAbility,
  PeekResult,
  RoundEndData,
  RoundPlayerResult,
  UseAbilityPayload,
} from '@cabo/shared'
import { createShuffledDeck, shuffle, getAbilityType } from './deck'

// ─── Server-side player ────────────────────────────────────────────────────────

interface ServerPlayer {
  id: string
  name: string
  cards: CardData[]
  knownIndices: Set<number>
  totalScore: number
  isEliminated: boolean
  isReady: boolean
  isConnected: boolean
}

// ─── Server-side game state ────────────────────────────────────────────────────

export interface ServerGameState {
  roomId: string
  hostId: string
  phase: GamePhase
  players: ServerPlayer[]
  currentPlayerIndex: number
  deck: CardData[]
  discardPile: CardData[]
  drawnCard: CardData | null
  drawnFrom: 'deck' | 'discard' | null
  caboCallerId: string | null
  caboCallerIndex: number | null
  round: number
  pendingAbility: { type: PendingAbility['type']; card: CardData } | null
  peeksDone: Set<string>
  roundEndData: RoundEndData | null
}

// ─── Action result ─────────────────────────────────────────────────────────────

export interface ActionResult {
  ok: boolean
  error?: string
  peekResult?: PeekResult
  roundEnded?: boolean
  discardedCard?: CardData
  reshuffled?: boolean
}

// ─── CaboGame class ────────────────────────────────────────────────────────────

export class CaboGame {
  state: ServerGameState

  constructor(roomId: string, hostId: string, hostName: string) {
    this.state = {
      roomId,
      hostId,
      phase: 'lobby',
      players: [
        {
          id: hostId,
          name: hostName,
          cards: [],
          knownIndices: new Set(),
          totalScore: 0,
          isEliminated: false,
          isReady: false,
          isConnected: true,
        },
      ],
      currentPlayerIndex: 0,
      deck: [],
      discardPile: [],
      drawnCard: null,
      drawnFrom: null,
      caboCallerId: null,
      caboCallerIndex: null,
      round: 0,
      pendingAbility: null,
      peeksDone: new Set(),
      roundEndData: null,
    }
  }

  // ─── Lobby ──────────────────────────────────────────────────────────────────

  addPlayer(socketId: string, name: string): ActionResult {
    if (this.state.phase !== 'lobby') return { ok: false, error: 'Game already started' }
    if (this.state.players.length >= 5) return { ok: false, error: 'Room is full (max 5)' }
    if (this.state.players.find((p) => p.id === socketId)) return { ok: false, error: 'Already in room' }
    this.state.players.push({
      id: socketId,
      name,
      cards: [],
      knownIndices: new Set(),
      totalScore: 0,
      isEliminated: false,
      isReady: false,
      isConnected: true,
    })
    return { ok: true }
  }

  reconnectPlayer(oldId: string, newId: string): boolean {
    const p = this.state.players.find((p) => p.id === oldId)
    if (!p) return false
    p.id = newId
    p.isConnected = true
    if (this.state.hostId === oldId) this.state.hostId = newId
    if (this.state.caboCallerId === oldId) this.state.caboCallerId = newId
    return true
  }

  markDisconnected(socketId: string) {
    const p = this.state.players.find((p) => p.id === socketId)
    if (p) p.isConnected = false
  }

  setReady(socketId: string): ActionResult {
    const p = this.state.players.find((p) => p.id === socketId)
    if (!p) return { ok: false, error: 'Not in room' }
    p.isReady = !p.isReady
    return { ok: true }
  }

  startGame(socketId: string): ActionResult {
    if (socketId !== this.state.hostId) return { ok: false, error: 'Only the host can start' }
    if (this.state.phase === 'round-end') {
      // Next round
      this.dealRound()
      return { ok: true }
    }
    if (this.state.phase !== 'lobby') return { ok: false, error: 'Game already started' }
    const active = this.activePlayers()
    if (active.length < 2) return { ok: false, error: 'Need at least 2 players' }
    this.dealRound()
    return { ok: true }
  }

  // ─── Round setup ────────────────────────────────────────────────────────────

  private dealRound() {
    const s = this.state
    s.round++
    s.deck = createShuffledDeck()
    s.discardPile = []
    s.drawnCard = null
    s.drawnFrom = null
    s.caboCallerId = null
    s.caboCallerIndex = null
    s.pendingAbility = null
    s.peeksDone = new Set()
    s.roundEndData = null

    for (const p of this.activePlayers()) {
      p.cards = [s.deck.pop()!, s.deck.pop()!, s.deck.pop()!, s.deck.pop()!]
      p.knownIndices = new Set()
    }

    // Flip first card to start discard pile
    s.discardPile.push(s.deck.pop()!)
    s.currentPlayerIndex = 0
    s.phase = 'initial-peek'
  }

  confirmInitialPeek(socketId: string): ActionResult {
    if (this.state.phase !== 'initial-peek') return { ok: false, error: 'Wrong phase' }
    const p = this.state.players.find((pl) => pl.id === socketId)
    if (!p) return { ok: false, error: 'Not in game' }

    // Always mark the bottom 2 cards as known
    p.knownIndices.add(2)
    p.knownIndices.add(3)
    this.state.peeksDone.add(socketId)

    const active = this.activePlayers()
    if (active.every((ap) => this.state.peeksDone.has(ap.id))) {
      this.state.phase = 'draw'
      this.state.currentPlayerIndex = 0
    }
    return { ok: true }
  }

  // ─── Turn actions ────────────────────────────────────────────────────────────

  drawFromDeck(socketId: string): ActionResult {
    const check = this.validateTurn(socketId, 'draw')
    if (!check.ok) return check
    const card = this.state.deck.pop()!
    this.state.drawnCard = card
    this.state.drawnFrom = 'deck'
    this.state.phase = 'act'
    return { ok: true }
  }

  drawFromDiscard(socketId: string): ActionResult {
    const check = this.validateTurn(socketId, 'draw')
    if (!check.ok) return check
    if (this.state.discardPile.length === 0) return { ok: false, error: 'Discard pile is empty' }
    const card = this.state.discardPile.pop()!
    this.state.drawnCard = card
    this.state.drawnFrom = 'discard'
    this.state.phase = 'act'
    return { ok: true }
  }

  discardDrawn(socketId: string): ActionResult {
    const check = this.validateTurn(socketId, 'act')
    if (!check.ok) return check
    const card = this.state.drawnCard!
    this.state.discardPile.push(card)
    this.state.drawnCard = null
    this.state.drawnFrom = null

    const abilityType = getAbilityType(card)
    if (abilityType) {
      this.state.phase = 'ability'
      this.state.pendingAbility = { type: abilityType, card }
    } else {
      this.advanceTurn()
    }
    return { ok: true, discardedCard: card }
  }

  swap(socketId: string, cardIndex: number): ActionResult {
    const check = this.validateTurn(socketId, 'act')
    if (!check.ok) return check
    if (cardIndex < 0 || cardIndex >= this.currentPlayer()!.cards.length) return { ok: false, error: 'Invalid card index' }

    const player = this.currentPlayer()!
    const drawn = this.state.drawnCard!
    const replaced = player.cards[cardIndex]

    player.cards[cardIndex] = drawn
    player.knownIndices.add(cardIndex)
    this.state.discardPile.push(replaced)
    this.state.drawnCard = null
    this.state.drawnFrom = null

    this.advanceTurn()
    return { ok: true, discardedCard: replaced }
  }

  callCabo(socketId: string): ActionResult {
    const check = this.validateTurn(socketId, 'draw')
    if (!check.ok) return check
    if (this.state.caboCallerId) return { ok: false, error: 'Cabo already called' }
    this.state.caboCallerId = socketId
    this.state.caboCallerIndex = this.state.currentPlayerIndex
    this.advanceTurn()
    return { ok: true }
  }

  useAbility(socketId: string, payload: UseAbilityPayload): ActionResult {
    const check = this.validateTurn(socketId, 'ability')
    if (!check.ok) return check

    const currentPlayer = this.currentPlayer()!
    let peekResult: PeekResult | undefined

    switch (payload.type) {
      case 'peek-own': {
        const { cardIndex } = payload
        if (cardIndex < 0 || cardIndex > 3) return { ok: false, error: 'Invalid card index' }
        currentPlayer.knownIndices.add(cardIndex)
        peekResult = { targetPlayerId: socketId, cardIndex, card: currentPlayer.cards[cardIndex] }
        break
      }
      case 'peek-opponent': {
        const target = this.state.players.find((p) => p.id === payload.targetPlayerId)
        if (!target || target.id === socketId) return { ok: false, error: 'Invalid target' }
        const { cardIndex } = payload
        if (cardIndex < 0 || cardIndex > 3) return { ok: false, error: 'Invalid card index' }
        peekResult = { targetPlayerId: target.id, cardIndex, card: target.cards[cardIndex] }
        break
      }
      case 'blind-swap': {
        const { ownCardIndex, targetPlayerId, targetCardIndex } = payload
        const target = this.state.players.find((p) => p.id === targetPlayerId)
        if (!target || target.id === socketId) return { ok: false, error: 'Invalid target' }
        if (ownCardIndex < 0 || ownCardIndex > 3) return { ok: false, error: 'Invalid own card index' }
        if (targetCardIndex < 0 || targetCardIndex > 3) return { ok: false, error: 'Invalid target card index' }
        const temp = currentPlayer.cards[ownCardIndex]
        currentPlayer.cards[ownCardIndex] = target.cards[targetCardIndex]
        target.cards[targetCardIndex] = temp
        currentPlayer.knownIndices.delete(ownCardIndex)
        target.knownIndices.delete(targetCardIndex)
        break
      }
      case 'king': {
        const { targetPlayerId, targetCardIndex } = payload
        const target = this.state.players.find((p) => p.id === targetPlayerId)
        if (!target || target.id === socketId) return { ok: false, error: 'Invalid target' }
        if (targetCardIndex < 0 || targetCardIndex > 3) return { ok: false, error: 'Invalid target card index' }
        const spied = target.cards[targetCardIndex]
        peekResult = { targetPlayerId: target.id, cardIndex: targetCardIndex, card: spied }
        if (payload.swap && payload.ownCardIndex !== undefined) {
          const ownIdx = payload.ownCardIndex
          if (ownIdx < 0 || ownIdx > 3) return { ok: false, error: 'Invalid own card index' }
          const temp = currentPlayer.cards[ownIdx]
          currentPlayer.cards[ownIdx] = spied
          target.cards[targetCardIndex] = temp
          currentPlayer.knownIndices.add(ownIdx)
          target.knownIndices.delete(targetCardIndex)
        }
        break
      }
    }

    this.state.pendingAbility = null
    this.advanceTurn()
    return { ok: true, peekResult }
  }

  snap(socketId: string, cardIndex: number): ActionResult {
    const s = this.state
    if (s.phase === 'initial-peek' || s.phase === 'round-end' || s.phase === 'game-over') {
      return { ok: false, error: 'Cannot snap right now' }
    }
    const player = s.players.find((p) => p.id === socketId)
    if (!player || player.isEliminated) return { ok: false, error: 'Not in game' }
    if (cardIndex < 0 || cardIndex >= player.cards.length) return { ok: false, error: 'Invalid card index' }

    const discardTop = s.discardPile[s.discardPile.length - 1]
    if (!discardTop) return { ok: false, error: 'Nothing to snap' }

    const snappedCard = player.cards[cardIndex]
    if (snappedCard.rank === discardTop.rank) {
      // Correct snap: remove card from hand, add to discard
      player.cards.splice(cardIndex, 1)
      s.discardPile.push(snappedCard)
      // Rebuild knownIndices: shift indices > cardIndex down by 1
      const newKnown = new Set<number>()
      for (const idx of player.knownIndices) {
        if (idx < cardIndex) newKnown.add(idx)
        else if (idx > cardIndex) newKnown.add(idx - 1)
        // idx === cardIndex is gone
      }
      player.knownIndices = newKnown
      return { ok: true }
    } else {
      // Wrong snap: draw a penalty card from deck
      const reshuffled = this.ensureDeckHasCards()
      const penalty = s.deck.pop()
      if (penalty) player.cards.push(penalty)
      return { ok: false, error: 'Wrong snap! Penalty card added.', reshuffled }
    }
  }

  skipAbility(socketId: string): ActionResult {
    const check = this.validateTurn(socketId, 'ability')
    if (!check.ok) return check
    this.state.pendingAbility = null
    this.advanceTurn()
    return { ok: true }
  }

  // ─── Turn advancement & round end ──────────────────────────────────────────

  private advanceTurn() {
    const s = this.state
    const active = this.activePlayers()
    let next = (s.currentPlayerIndex + 1) % s.players.length

    // Skip eliminated players
    let safety = 0
    while (s.players[next]?.isEliminated && safety < s.players.length) {
      next = (next + 1) % s.players.length
      safety++
    }

    // If cabo was called and we're back to the caller → end round
    if (s.caboCallerIndex !== null && next === s.caboCallerIndex) {
      this.endRound()
      return
    }

    s.currentPlayerIndex = next
    s.phase = 'draw'
  }

  private endRound() {
    const s = this.state
    s.phase = 'round-end'

    const active = this.activePlayers()
    const scores = active.map((p) => ({ p, score: p.cards.reduce((sum, c) => sum + c.value, 0) }))
    const minScore = Math.min(...scores.map((x) => x.score))
    const caboPlayer = s.players.find((p) => p.id === s.caboCallerId)

    const results: RoundPlayerResult[] = scores.map(({ p, score }) => {
      const isCallerAndLost = p.id === s.caboCallerId && score > minScore
      const caboBonus = isCallerAndLost ? 10 : 0
      const roundTotal = score + caboBonus
      p.totalScore += roundTotal
      const eliminated = p.totalScore >= 100
      if (eliminated) p.isEliminated = true
      return {
        playerId: p.id,
        playerName: p.name,
        cards: [...p.cards],
        roundScore: score,
        caboBonus,
        totalScoreAfter: p.totalScore,
        eliminated,
      }
    })

    const roundWinner = scores.reduce((a, b) => (a.score <= b.score ? a : b))
    const remaining = active.filter((p) => !p.isEliminated)
    const gameOver = remaining.length <= 1

    s.roundEndData = {
      results,
      caboCallerId: s.caboCallerId!,
      roundWinnerId: roundWinner.p.id,
      gameOver,
      gameWinnerId: gameOver ? remaining[0]?.id : undefined,
    }

    if (gameOver) s.phase = 'game-over'
  }

  // ─── View generation ────────────────────────────────────────────────────────

  getViewForPlayer(socketId: string): GameView {
    const s = this.state
    const isMyTurn = s.players[s.currentPlayerIndex]?.id === socketId

    const players: PlayerView[] = s.players.map((p) => {
      const isMe = p.id === socketId
      const cards: CardView[] = p.cards.map((c, i) => {
        // During initial-peek, reveal only the bottom 2 cards (indices 2 & 3) to the player
        if (isMe && s.phase === 'initial-peek' && !s.peeksDone.has(socketId)) return (i === 2 || i === 3) ? c : null
        if (isMe && p.knownIndices.has(i)) return c
        return null
      })
      return {
        id: p.id,
        name: p.name,
        isHost: p.id === s.hostId,
        isConnected: p.isConnected,
        isReady: p.isReady,
        cards,
        totalScore: p.totalScore,
        isEliminated: p.isEliminated,
        knownIndices: isMe ? Array.from(p.knownIndices) : undefined,
      }
    })

    const pendingAbility: PendingAbility | null = s.pendingAbility
      ? { type: s.pendingAbility.type, cardThatTriggered: s.pendingAbility.card }
      : null

    return {
      roomId: s.roomId,
      phase: s.phase,
      players,
      myPlayerId: socketId,
      currentPlayerId: s.players[s.currentPlayerIndex]?.id ?? '',
      caboCallerId: s.caboCallerId,
      deckCount: s.deck.length,
      discardTop: s.discardPile[s.discardPile.length - 1] ?? null,
      drawnCard: isMyTurn && s.phase === 'act' ? s.drawnCard : null,
      round: s.round,
      pendingAbility,
      roundEndData: s.roundEndData,
      initialPeekDone: s.peeksDone.has(socketId),
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  activePlayers() {
    return this.state.players.filter((p) => !p.isEliminated)
  }

  currentPlayer() {
    return this.state.players[this.state.currentPlayerIndex]
  }

  private validateTurn(socketId: string, expectedPhase: GamePhase): ActionResult {
    const s = this.state
    if (s.phase !== expectedPhase) return { ok: false, error: `Expected phase '${expectedPhase}', got '${s.phase}'` }
    if (s.players[s.currentPlayerIndex]?.id !== socketId) return { ok: false, error: "Not your turn" }
    return { ok: true }
  }

  ensureDeckHasCards(): boolean {
    const s = this.state
    if (s.deck.length > 0) return false
    if (s.discardPile.length <= 1) return false
    const top = s.discardPile.pop()!
    s.deck = shuffle(s.discardPile)
    s.discardPile = [top]
    return true   // signals that a reshuffle happened
  }

  getPlayerById(id: string) {
    return this.state.players.find((p) => p.id === id)
  }
}
