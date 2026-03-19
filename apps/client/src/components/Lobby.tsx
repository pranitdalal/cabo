'use client'
import { motion } from 'framer-motion'
import type { RoomInfo } from '@cabo/shared'

interface LobbyProps {
  roomId: string
  roomInfo: RoomInfo | null
  myPlayerId: string
  onReady: () => void
  onStart: () => void
}

export default function Lobby({ roomId, roomInfo, myPlayerId, onReady, onStart }: LobbyProps) {
  const me = roomInfo?.players.find((p) => p.id === myPlayerId)
  const isHost = me?.isHost ?? false
  const allReady = roomInfo ? roomInfo.players.every((p) => p.isReady || p.isHost) : false
  const canStart = isHost && (roomInfo?.players.length ?? 0) >= 2 && allReady

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {})
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-felt rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/10"
      >
        <h1 className="text-3xl font-bold text-center text-white mb-1">Cabo</h1>
        <p className="text-center text-white/40 text-sm mb-6">Room: <span className="font-mono text-white/70">{roomId}</span></p>

        {/* Share link */}
        <div className="flex gap-2 mb-6">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-mono outline-none"
          />
          <button
            onClick={copyLink}
            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Players */}
        <div className="space-y-2 mb-6">
          {roomInfo?.players.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg
                ${p.id === myPlayerId ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-white/5'}
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-white font-medium">{p.name}</span>
                {p.isHost && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Host</span>}
              </div>
              <span className={`text-xs font-semibold ${p.isReady || p.isHost ? 'text-emerald-400' : 'text-white/30'}`}>
                {p.isHost ? 'Host' : p.isReady ? 'Ready ✓' : 'Not ready'}
              </span>
            </motion.div>
          )) ?? (
            <p className="text-center text-white/30 text-sm">Connecting…</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {!isHost && (
            <motion.button
              onClick={onReady}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-3 rounded-xl font-bold text-base transition-colors
                ${me?.isReady ? 'bg-white/10 text-white/60' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
              `}
            >
              {me?.isReady ? 'Cancel Ready' : 'Ready Up'}
            </motion.button>
          )}
          {isHost && (
            <motion.button
              onClick={onStart}
              disabled={!canStart}
              whileHover={canStart ? { scale: 1.03 } : {}}
              whileTap={canStart ? { scale: 0.97 } : {}}
              className={`w-full py-3 rounded-xl font-bold text-base transition-colors
                ${canStart ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-white/10 text-white/30 cursor-not-allowed'}
              `}
            >
              {canStart ? 'Start Game' : (roomInfo?.players.length ?? 0) < 2 ? 'Need 2+ players' : 'Waiting for players to ready up…'}
            </motion.button>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-4">2–5 players</p>
      </motion.div>
    </div>
  )
}
