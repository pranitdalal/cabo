'use client'
import { motion } from 'framer-motion'
import type { PlayerView, CardData, GamePhase, PendingAbility } from '@cabo/shared'
import Card from './Card'

interface OtherPlayerProps {
  player: PlayerView
  isCurrentTurn: boolean
  peekReveals: Record<string, CardData>   // key = cardIndex (string)
  phase: GamePhase
  pendingAbility: PendingAbility | null
  isMyTurn: boolean
  // Full, unfiltered ability selection
  abilitySelection: {
    ownCardIndex: number | null
    targetPlayerId: string | null
    targetCardIndex: number | null
  }
  /** Called when player clicks a card on this opponent (sets both target + card index) */
  onSelectCard: (playerId: string, cardIndex: number) => void
  caboCallerId: string | null
}

export default function OtherPlayer({
  player,
  isCurrentTurn,
  peekReveals,
  phase,
  pendingAbility,
  isMyTurn,
  abilitySelection,
  onSelectCard,
  caboCallerId,
}: OtherPlayerProps) {
  // Can we target this player's cards at all?
  const abilityTargetsOpponents =
    isMyTurn &&
    phase === 'ability' &&
    pendingAbility !== null &&
    pendingAbility.type !== 'peek-own'

  const isThisPlayerSelected = abilitySelection.targetPlayerId === player.id

  function getCardToShow(index: number): CardData | null {
    const r = peekReveals[String(index)]
    return r ?? (player.cards[index] as CardData | null)
  }

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all
        ${isCurrentTurn ? 'bg-yellow-400/10 ring-1 ring-yellow-400/50' : 'bg-white/5'}
        ${player.isEliminated ? 'opacity-30' : ''}
        ${abilityTargetsOpponents ? 'ring-1 ring-purple-400/40' : ''}
      `}
      animate={isCurrentTurn ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Name + status */}
      <div className="flex items-center gap-2">
        {isCurrentTurn && <span className="text-yellow-400 text-xs animate-pulse">▶</span>}
        <span className={`text-sm font-semibold ${isCurrentTurn ? 'text-yellow-300' : 'text-white/80'}`}>
          {player.name}
        </span>
        {caboCallerId === player.id && (
          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">CABO</span>
        )}
        {!player.isConnected && <span className="text-xs text-red-400">(offline)</span>}
      </div>

      {/* Score */}
      <span className="text-xs text-white/40">{player.totalScore} pts</span>

      {/* Cards */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {player.cards.map((_card, i) => {
          const cardToShow = getCardToShow(i)
          const isPeeked = !!peekReveals[String(i)]
          const isSelectedCard = isThisPlayerSelected && abilitySelection.targetCardIndex === i
          const isClickable = abilityTargetsOpponents && !player.isEliminated
          return (
            <Card
              key={i}
              card={cardToShow}
              size="sm"
              isPeeked={isPeeked}
              isSelected={isSelectedCard}
              isHighlighted={isClickable && !isSelectedCard}
              onClick={isClickable ? () => onSelectCard(player.id, i) : undefined}
            />
          )
        })}
      </div>
    </motion.div>
  )
}
