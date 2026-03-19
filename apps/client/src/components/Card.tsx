'use client'
import { motion } from 'framer-motion'
import type { CardData } from '@cabo/shared'

interface CardProps {
  card: CardData | null        // null = face down
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isSelected?: boolean
  isHighlighted?: boolean
  isPeeked?: boolean           // glowing peek reveal
  onClick?: () => void
  className?: string
  disabled?: boolean
}

const SIZES = {
  xs: { w: 'w-10', h: 'h-14', rank: 'text-sm', suit: 'text-base' },
  sm: { w: 'w-14', h: 'h-20', rank: 'text-base', suit: 'text-xl' },
  md: { w: 'w-16', h: 'h-24', rank: 'text-lg', suit: 'text-2xl' },
  lg: { w: 'w-20', h: 'h-28', rank: 'text-xl', suit: 'text-3xl' },
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
}

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-500', diamonds: 'text-red-500',
  clubs: 'text-gray-900', spades: 'text-gray-900',
}

export default function Card({
  card,
  size = 'md',
  isSelected,
  isHighlighted,
  isPeeked,
  onClick,
  className = '',
  disabled,
}: CardProps) {
  const s = SIZES[size]
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds'
  const isJoker = card?.rank === 'JOKER'

  const borderClass = isSelected
    ? 'ring-2 ring-yellow-400 shadow-yellow-400/60 shadow-lg'
    : isHighlighted
    ? 'ring-2 ring-blue-400 shadow-blue-400/60 shadow-lg'
    : isPeeked
    ? 'ring-2 ring-emerald-400 shadow-emerald-400/60 shadow-lg animate-pulse-glow'
    : 'ring-1 ring-white/20'

  return (
    <motion.div
      className={`card-wrapper ${s.w} ${s.h} ${className}`}
      whileHover={onClick && !disabled ? { scale: 1.08, y: -4 } : {}}
      whileTap={onClick && !disabled ? { scale: 0.96 } : {}}
      onClick={disabled ? undefined : onClick}
      style={{ cursor: onClick && !disabled ? 'pointer' : 'default' }}
    >
      <div className={`card-inner ${card ? 'flipped' : ''}`}>
        {/* Back (face-down) */}
        <div
          className={`card-face rounded-lg flex items-center justify-center bg-blue-900 border border-blue-700 ${borderClass}`}
        >
          <div className="w-3/4 h-3/4 rounded border border-blue-600 bg-blue-800/60 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold select-none">CABO</span>
          </div>
        </div>

        {/* Face (shown when card !== null) */}
        <div
          className={`card-back rounded-lg flex flex-col p-1 select-none
            ${isJoker ? 'bg-gradient-to-br from-purple-100 to-pink-100' : 'bg-white'}
            ${borderClass}
          `}
        >
          {card && !isJoker && (
            <>
              <div className={`${s.rank} font-bold leading-none ${SUIT_COLORS[card.suit ?? ''] ?? 'text-gray-900'}`}>
                {card.rank}
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className={`${s.suit} ${SUIT_COLORS[card.suit ?? ''] ?? 'text-gray-900'}`}>
                  {SUIT_SYMBOLS[card.suit ?? ''] ?? ''}
                </span>
              </div>
              <div className={`${s.rank} font-bold leading-none self-end rotate-180 ${SUIT_COLORS[card.suit ?? ''] ?? 'text-gray-900'}`}>
                {card.rank}
              </div>
            </>
          )}
          {card && isJoker && (
            <div className="flex-1 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl">🃏</span>
              <span className="text-xs font-bold text-purple-700">JOKER</span>
              <span className="text-xs text-purple-500">−2</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
