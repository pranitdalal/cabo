'use client'
import { motion } from 'framer-motion'
import type { GameView, PendingAbility } from '@cabo/shared'

interface ActionPanelProps {
  view: GameView
  isMyTurn: boolean
  abilitySelection: {
    ownCardIndex: number | null
    targetPlayerId: string | null
    targetCardIndex: number | null
  }
  onCallCabo: () => void
  onDiscardDrawn: () => void
  onConfirmInitialPeek: (indices: number[]) => void
  onUseAbility: () => void
  onSkipAbility: () => void
  onClearAbilitySelection: () => void
}

function Btn({
  onClick,
  children,
  variant = 'default',
  disabled,
}: {
  onClick: () => void
  children: React.ReactNode
  variant?: 'default' | 'danger' | 'success' | 'warning'
  disabled?: boolean
}) {
  const colors = {
    default: 'bg-white/10 hover:bg-white/20 text-white border-white/20',
    danger: 'bg-red-600 hover:bg-red-500 text-white border-red-500',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500',
    warning: 'bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-400',
  }
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className={`px-4 py-2 rounded-lg border font-semibold text-sm transition-colors
        ${colors[variant]}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </motion.button>
  )
}

function abilityInstructions(ab: PendingAbility) {
  switch (ab.type) {
    case 'peek-own': return '7/8 ability: Click one of your own cards to peek at it'
    case 'peek-opponent': return '9/10 ability: Click an opponent\'s card to spy on it'
    case 'blind-swap': return 'J/Q ability: Pick one of your cards, then an opponent\'s card to swap'
    case 'king': return 'K ability: Click an opponent\'s card to spy on it (optionally also click one of your own cards to swap)'
  }
}

export default function ActionPanel({
  view,
  isMyTurn,
  abilitySelection,
  onCallCabo,
  onDiscardDrawn,
  onConfirmInitialPeek,
  onUseAbility,
  onSkipAbility,
  onClearAbilitySelection,
}: ActionPanelProps) {
  const { phase, drawnCard, pendingAbility, caboCallerId } = view

  // ── Initial peek ──────────────────────────────────────────────────────────
  if (phase === 'initial-peek' && !view.initialPeekDone) {
    return (
      <div className="flex flex-col items-center gap-3 bg-white/5 rounded-xl px-6 py-4">
        <p className="text-yellow-300 font-semibold text-sm">
          Memorise your bottom 2 cards, then confirm
        </p>
        <Btn onClick={() => onConfirmInitialPeek([])} variant="success">
          Got it!
        </Btn>
      </div>
    )
  }

  if (phase === 'initial-peek' && view.initialPeekDone) {
    return (
      <div className="text-center text-white/40 text-sm py-3">
        Waiting for other players to finish peeking…
      </div>
    )
  }

  if (!isMyTurn) {
    const currentName = view.players.find((p) => p.id === view.currentPlayerId)?.name ?? '...'
    const snapHint = (phase === 'draw' || phase === 'act') && view.discardTop
    return (
      <div className="text-center text-sm py-3 flex flex-col gap-1">
        <span className="text-white/40">
          Waiting for <span className="text-white/70 font-semibold">{currentName}</span>…
        </span>
        {snapHint && (
          <span className="text-orange-400/70 text-xs">
            Click <span className="font-bold">Snap!</span> on a matching card to snap the discard ({view.discardTop!.rank})
          </span>
        )}
      </div>
    )
  }

  // ── Draw phase ────────────────────────────────────────────────────────────
  if (phase === 'draw') {
    return (
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {!caboCallerId && (
          <Btn onClick={onCallCabo} variant="danger">
            🚩 Call CABO
          </Btn>
        )}
        <span className="text-white/30 text-xs">← Click deck or discard to draw</span>
      </div>
    )
  }

  // ── Act phase ─────────────────────────────────────────────────────────────
  if (phase === 'act' && drawnCard) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-white/50 text-xs">Click a hand card to swap, or:</p>
        <Btn onClick={onDiscardDrawn} variant="warning">
          Discard Drawn Card
        </Btn>
      </div>
    )
  }

  // ── Ability phase ─────────────────────────────────────────────────────────
  if (phase === 'ability' && pendingAbility) {
    const canConfirm = (() => {
      switch (pendingAbility.type) {
        case 'peek-own': return abilitySelection.ownCardIndex !== null
        case 'peek-opponent': return abilitySelection.targetPlayerId !== null && abilitySelection.targetCardIndex !== null
        case 'blind-swap': return abilitySelection.ownCardIndex !== null && abilitySelection.targetPlayerId !== null && abilitySelection.targetCardIndex !== null
        case 'king': return abilitySelection.targetPlayerId !== null && abilitySelection.targetCardIndex !== null
      }
    })()

    return (
      <div className="flex flex-col items-center gap-3 bg-purple-900/30 rounded-xl px-6 py-4 border border-purple-500/30">
        <p className="text-purple-300 font-semibold text-sm">{abilityInstructions(pendingAbility)}</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Btn onClick={onUseAbility} variant="success" disabled={!canConfirm}>
            Confirm Ability
          </Btn>
          {abilitySelection.ownCardIndex !== null || abilitySelection.targetPlayerId !== null ? (
            <Btn onClick={onClearAbilitySelection} variant="default">
              Clear Selection
            </Btn>
          ) : null}
          <Btn onClick={onSkipAbility} variant="default">
            Skip
          </Btn>
        </div>
      </div>
    )
  }

  return null
}
