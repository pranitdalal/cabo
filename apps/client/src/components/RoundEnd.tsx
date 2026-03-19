'use client'
import { motion } from 'framer-motion'
import type { RoundEndData } from '@cabo/shared'
import Card from './Card'

interface RoundEndProps {
  data: RoundEndData
  myPlayerId: string
  isHost: boolean
  onNextRound: () => void
}

export default function RoundEnd({ data, myPlayerId, isHost, onNextRound }: RoundEndProps) {
  const sorted = [...data.results].sort((a, b) => a.roundScore - b.roundScore)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.85, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-felt rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        {data.gameOver ? (
          <h2 className="text-2xl font-bold text-center text-yellow-400 mb-1">Game Over!</h2>
        ) : (
          <h2 className="text-2xl font-bold text-center text-white mb-1">Round End</h2>
        )}

        {data.gameOver && data.gameWinnerId && (
          <p className="text-center text-emerald-400 font-semibold mb-4">
            🏆 {data.results.find((r) => r.playerId === data.gameWinnerId)?.playerName} wins!
          </p>
        )}

        <p className="text-center text-white/40 text-sm mb-4">
          CABO called by <span className="text-white/70">{data.results.find((r) => r.playerId === data.caboCallerId)?.playerName}</span>
          {' · '}
          Round winner: <span className="text-emerald-400">{data.results.find((r) => r.playerId === data.roundWinnerId)?.playerName}</span>
        </p>

        <div className="space-y-4 mb-6">
          {sorted.map((r, idx) => (
            <motion.div
              key={r.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-xl p-4 border
                ${r.playerId === myPlayerId ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-white/10 bg-white/5'}
                ${r.eliminated ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {idx === 0 && !r.eliminated && <span className="text-lg">🥇</span>}
                  <span className="font-semibold text-white">{r.playerName}</span>
                  {r.playerId === data.caboCallerId && (
                    <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">CABO</span>
                  )}
                  {r.eliminated && (
                    <span className="text-xs bg-gray-600 text-white px-1.5 py-0.5 rounded">Eliminated</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">
                    {r.roundScore}
                    {r.caboBonus > 0 && <span className="text-red-400 text-sm"> +{r.caboBonus}</span>}
                  </div>
                  <div className="text-white/40 text-xs">Total: {r.totalScoreAfter}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {r.cards.map((c) => (
                  <Card key={c.id} card={c} size="xs" />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {!data.gameOver && isHost && (
          <motion.button
            onClick={onNextRound}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base"
          >
            Next Round
          </motion.button>
        )}
        {!data.gameOver && !isHost && (
          <p className="text-center text-white/40 text-sm">Waiting for host to start next round…</p>
        )}
      </motion.div>
    </motion.div>
  )
}
