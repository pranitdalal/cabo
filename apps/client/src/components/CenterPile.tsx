'use client'
import { motion, AnimatePresence } from 'framer-motion'
import type { CardData } from '@cabo/shared'
import Card from './Card'

interface CenterPileProps {
  deckCount: number
  discardTop: CardData | null
  canDraw: boolean
  canDrawDiscard: boolean
  onDrawDeck: () => void
  onDrawDiscard: () => void
}

export default function CenterPile({
  deckCount,
  discardTop,
  canDraw,
  canDrawDiscard,
  onDrawDeck,
  onDrawDiscard,
}: CenterPileProps) {
  return (
    <div className="flex items-center justify-center gap-10">
      {/* Deck */}
      <div className="flex flex-col items-center gap-2">
        <motion.button
          onClick={canDraw ? onDrawDeck : undefined}
          whileHover={canDraw ? { scale: 1.06 } : {}}
          whileTap={canDraw ? { scale: 0.94 } : {}}
          className={`relative w-16 h-24 rounded-lg border-2 flex items-center justify-center
            ${canDraw ? 'border-yellow-400 cursor-pointer shadow-yellow-400/40 shadow-lg' : 'border-white/20 cursor-default'}
            bg-blue-900`}
          title="Draw from deck"
        >
          {/* Stack illusion */}
          {deckCount > 2 && (
            <div className="absolute -bottom-0.5 -left-0.5 w-16 h-24 rounded-lg bg-blue-800 -z-10" />
          )}
          {deckCount > 5 && (
            <div className="absolute -bottom-1 -left-1 w-16 h-24 rounded-lg bg-blue-700 -z-20" />
          )}
          <span className="text-blue-300 font-bold text-sm select-none">{deckCount}</span>
          {canDraw && (
            <span className="absolute -top-6 text-xs text-yellow-300 font-semibold whitespace-nowrap">Click to draw</span>
          )}
        </motion.button>
        <span className="text-xs text-white/40">Deck</span>
      </div>

      {/* Discard pile */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-16 h-24">
          <AnimatePresence mode="popLayout">
            {discardTop ? (
              <motion.div
                key={discardTop.id}
                initial={{ y: -20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute inset-0"
              >
                <Card
                  card={discardTop}
                  size="md"
                  onClick={canDrawDiscard ? onDrawDiscard : undefined}
                  isHighlighted={canDrawDiscard}
                  className="w-full h-full"
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="w-16 h-24 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center"
              >
                <span className="text-white/20 text-xs">Empty</span>
              </motion.div>
            )}
          </AnimatePresence>
          {canDrawDiscard && (
            <span className="absolute -top-6 text-xs text-blue-300 font-semibold whitespace-nowrap">Click to draw</span>
          )}
        </div>
        <span className="text-xs text-white/40">Discard</span>
      </div>
    </div>
  )
}
