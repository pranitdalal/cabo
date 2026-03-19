'use client'
import { motion, AnimatePresence } from 'framer-motion'
import type { CardView, CardData, GamePhase, PendingAbility } from '@cabo/shared'
import Card from './Card'

interface PlayerHandProps {
  cards: CardView[]
  peekReveals: Record<string, CardData>   // key = cardIndex (string)
  phase: GamePhase
  isMyTurn: boolean
  drawnCard: CardData | null
  pendingAbility: PendingAbility | null
  abilitySelection: { ownCardIndex: number | null }
  canSnap: boolean
  onSnap: (index: number) => void
  onSwap: (index: number) => void
  onAbilitySelectOwn: (index: number) => void
}

export default function PlayerHand({
  cards,
  peekReveals,
  phase,
  isMyTurn,
  drawnCard,
  pendingAbility,
  abilitySelection,
  canSnap,
  onSnap,
  onSwap,
  onAbilitySelectOwn,
}: PlayerHandProps) {
  const canSwap = isMyTurn && phase === 'act' && drawnCard !== null
  const isAbilityPeekOwn = isMyTurn && phase === 'ability' && pendingAbility?.type === 'peek-own'
  const isAbilityBlindSwap = isMyTurn && phase === 'ability' && pendingAbility?.type === 'blind-swap'
  const isAbilityKing = isMyTurn && phase === 'ability' && pendingAbility?.type === 'king'

  function handleCardClick(index: number) {
    if (canSwap) { onSwap(index); return }
    if (isAbilityPeekOwn) { onAbilitySelectOwn(index); return }
    if (isAbilityBlindSwap) { onAbilitySelectOwn(index); return }
    if (isAbilityKing) { onAbilitySelectOwn(index); return }
  }

  function isClickable(index: number) {
    if (canSwap) return true
    if (isAbilityPeekOwn) return true
    if (isAbilityBlindSwap) return true
    if (isAbilityKing) return true
    return false
  }

  function getHighlight(index: number): 'selected' | 'peeked' | 'none' {
    if (abilitySelection.ownCardIndex === index) return 'selected'
    const r = peekReveals[String(index)]
    if (r) return 'peeked'
    return 'none'
  }

  function getCardToShow(index: number): CardView {
    const r = peekReveals[String(index)]
    return r ?? cards[index]
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs text-white/50 font-medium uppercase tracking-wide">Your Hand</div>
      <div className="flex gap-3 flex-wrap justify-center">
        {cards.map((_card, i) => {
          const hl = getHighlight(i)
          const cardToShow = getCardToShow(i)
          return (
            <motion.div
              key={i}
              initial={false}
              animate={hl === 'selected' ? { y: -8 } : { y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-1"
            >
              <Card
                card={cardToShow}
                size="md"
                isSelected={hl === 'selected'}
                isPeeked={hl === 'peeked'}
                isHighlighted={isClickable(i) && hl === 'none'}
                onClick={isClickable(i) ? () => handleCardClick(i) : undefined}
              />
              {canSnap && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSnap(i)}
                  className="text-xs bg-orange-500 hover:bg-orange-400 text-white font-bold px-2 py-0.5 rounded-md"
                >
                  Snap!
                </motion.button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Drawn card floating above */}
      <AnimatePresence>
        {drawnCard && isMyTurn && (
          <motion.div
            key="drawn"
            initial={{ y: -30, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 18 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-xs text-yellow-300 font-semibold">Drawn — click a hand card to swap, or Discard below</div>
            <Card card={drawnCard} size="md" isHighlighted />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
