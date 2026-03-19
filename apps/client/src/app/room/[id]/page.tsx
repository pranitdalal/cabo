'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/hooks/useGame'
import Lobby from '@/components/Lobby'
import GameBoard from '@/components/GameBoard'
import { getSocket } from '@/lib/socket'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [joinError, setJoinError] = useState('')

  const game = useGame()
  const { view, roomInfo, toasts, dismissToast, setReady, startGame, confirmInitialPeek,
    drawDeck, drawDiscard, discardDrawn, swap, callCabo, useAbility, skipAbility, snap,
    setAbilitySelection, clearAbilitySelection, joinRoom } = game

  // Try auto-join with stored ID
  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('cabo_playerId') : null
    const storedName = typeof window !== 'undefined' ? localStorage.getItem('cabo_playerName') : null
    if (storedId && storedName && !joined) {
      setJoining(true)
      joinRoom(roomId, storedName)
        .then(() => setJoined(true))
        .catch(() => { /* prompt name */ })
        .finally(() => setJoining(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleJoin() {
    const n = nameInput.trim()
    if (!n) { setJoinError('Enter your name'); return }
    setJoining(true)
    setJoinError('')
    try {
      await joinRoom(roomId, n)
      setJoined(true)
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Could not join room')
    } finally {
      setJoining(false)
    }
  }

  // Handle "next round" via host start
  const handleNextRound = useCallback(() => {
    startGame()
  }, [startGame])

  // Determine phase
  const phase = view?.phase ?? 'lobby'
  const myPlayerId = view?.myPlayerId ?? ''

  if (!joined && !view) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-felt-dark">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-felt rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-white/10"
        >
          {joining ? (
            <p className="text-center text-white/60">Joining room…</p>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white text-center mb-6">Join Room</h2>
              <p className="text-center text-white/40 text-sm mb-4">
                Room: <span className="font-mono text-white/70">{roomId}</span>
              </p>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                className="w-full bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-yellow-400/60 mb-3"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              {joinError && <p className="text-red-400 text-sm text-center mb-2">{joinError}</p>}
              <motion.button
                onClick={handleJoin}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
              >
                Join
              </motion.button>
              <button
                onClick={() => router.push('/')}
                className="w-full mt-2 py-2 text-white/40 text-sm hover:text-white/70"
              >
                ← Back
              </button>
            </>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              onClick={() => dismissToast(t.id)}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl cursor-pointer text-sm font-medium
                ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-900'}
              `}
              style={{ maxWidth: 280 }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {phase === 'lobby' ? (
        <Lobby
          roomId={roomId}
          roomInfo={roomInfo}
          myPlayerId={myPlayerId}
          onReady={setReady}
          onStart={startGame}
        />
      ) : (
        <GameBoard
          gameState={game}
          onDrawDeck={drawDeck}
          onDrawDiscard={drawDiscard}
          onDiscardDrawn={discardDrawn}
          onSwap={swap}
          onCallCabo={callCabo}
          onUseAbility={useAbility}
          onSkipAbility={skipAbility}
          onConfirmInitialPeek={confirmInitialPeek}
          onSnap={snap}
          onSetAbility={setAbilitySelection}
          onClearAbility={clearAbilitySelection}
          onNextRound={handleNextRound}
        />
      )}
    </div>
  )
}
