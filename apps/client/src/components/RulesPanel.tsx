'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CARD_ABILITIES = [
  { ranks: '7 / 8', ability: 'Peek at one of your own face-down cards.' },
  { ranks: '9 / 10', ability: "Peek at one of an opponent's face-down cards." },
  { ranks: 'J / Q', ability: "Blind-swap: swap one of your cards with an opponent's card (neither player sees the swapped cards)." },
  { ranks: 'K', ability: "Spy & swap: peek at one opponent's card, then optionally swap it with one of your own." },
  { ranks: 'JOKER', ability: 'Worth −2 points. No special ability.' },
]

const RULES = [
  { title: 'Goal', body: 'Have the lowest total hand value when someone calls CABO. First player to 100+ points is eliminated. Last player standing wins.' },
  { title: 'Start of round', body: 'Each player gets 4 face-down cards. Secretly peek at your bottom 2 cards (indices 3 & 4), then the game begins.' },
  { title: 'Your turn', body: 'Draw from the deck or the discard pile. Then either swap the drawn card with one in your hand (discarding the old card) or discard the drawn card.' },
  { title: 'Snap!', body: 'At any time when a card is on the discard pile, click Snap! on a card in your hand with the same rank to discard it immediately. Wrong snap = penalty card added to your hand.' },
  { title: 'Calling CABO', body: "On your draw turn (before drawing) you may call CABO. Every other player gets one final turn, then hands are revealed. If the caller doesn't have the lowest score, they get +10 bonus points." },
  { title: 'Scoring', body: 'Cards are worth their face value. Aces = 1, face cards = 10, Joker = −2. Scores accumulate across rounds. Reach 100 → eliminated.' },
]

export default function RulesPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-lg shadow-lg flex items-center justify-center"
        title="Game rules"
      >
        ?
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />

            {/* Drawer */}
            <motion.aside
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-80 max-w-full z-50 bg-felt shadow-2xl border-l border-white/10 overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-felt z-10">
                <h2 className="text-white font-bold text-lg">Cabo Rules</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/50 hover:text-white text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-5 p-5 pb-8">
                {RULES.map((r) => (
                  <div key={r.title}>
                    <div className="text-yellow-300 font-semibold text-sm mb-1">{r.title}</div>
                    <p className="text-white/70 text-xs leading-relaxed">{r.body}</p>
                  </div>
                ))}

                <div>
                  <div className="text-yellow-300 font-semibold text-sm mb-2">Special card abilities</div>
                  <div className="flex flex-col gap-2">
                    {CARD_ABILITIES.map((a) => (
                      <div key={a.ranks} className="flex gap-3 items-start">
                        <span className="bg-white/10 text-white text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 min-w-[40px] text-center">
                          {a.ranks}
                        </span>
                        <p className="text-white/70 text-xs leading-relaxed">{a.ability}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-yellow-300 font-semibold text-sm mb-1">Card values</div>
                  <div className="grid grid-cols-3 gap-1 text-xs text-white/60">
                    <span>A = 1</span>
                    <span>2–10 = face value</span>
                    <span>J/Q/K = 10</span>
                    <span>Joker = −2</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
