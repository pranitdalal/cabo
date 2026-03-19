'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useGame } from '@/hooks/useGame'
import RulesPanel from '@/components/RulesPanel'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState('')

  const { createRoom, joinRoom } = useGame()

  const savedName = typeof window !== 'undefined' ? localStorage.getItem('cabo_playerName') ?? '' : ''

  async function handleCreate() {
    const playerName = name.trim() || savedName
    if (!playerName) { setError('Enter your name'); return }
    setLoading('create')
    setError('')
    try {
      const { roomId } = await createRoom(playerName)
      router.push(`/room/${roomId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create room')
    } finally {
      setLoading(null)
    }
  }

  async function handleJoin() {
    const playerName = name.trim() || savedName
    if (!playerName) { setError('Enter your name'); return }
    if (!joinCode.trim()) { setError('Enter a room code'); return }
    setLoading('join')
    setError('')
    try {
      await joinRoom(joinCode.trim().toLowerCase(), playerName)
      router.push(`/room/${joinCode.trim().toLowerCase()}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Room not found')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-felt-dark">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-felt rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-white/10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl mb-3"
          >
            🃏
          </motion.div>
          <h1 className="text-4xl font-bold text-white">Cabo</h1>
          <p className="text-white/40 text-sm mt-1">The memory card game</p>
        </div>

        {/* Name input */}
        <div className="mb-4">
          <label className="block text-white/60 text-sm mb-1.5">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={savedName || 'Enter name…'}
            maxLength={20}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-yellow-400/60 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>

        {/* Create room */}
        <motion.button
          onClick={handleCreate}
          disabled={loading !== null}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base mb-3 disabled:opacity-50 transition-colors"
        >
          {loading === 'create' ? 'Creating…' : 'Create Room'}
        </motion.button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or join</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Join room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Room code"
            maxLength={6}
            className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-blue-400/60 transition-all font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <motion.button
            onClick={handleJoin}
            disabled={loading !== null}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 transition-colors"
          >
            {loading === 'join' ? '…' : 'Join'}
          </motion.button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center mt-3"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
      <RulesPanel />
    </div>
  )
}
