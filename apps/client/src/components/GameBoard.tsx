'use client'
import { useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { UseAbilityPayload } from '@cabo/shared'
import type { GameState } from '@/hooks/useGame'
import CenterPile from './CenterPile'
import PlayerHand from './PlayerHand'
import OtherPlayer from './OtherPlayer'
import ActionPanel from './ActionPanel'
import RoundEnd from './RoundEnd'
import RulesPanel from './RulesPanel'

interface GameBoardProps {
  gameState: GameState
  onDrawDeck: () => void
  onDrawDiscard: () => void
  onDiscardDrawn: () => void
  onSwap: (idx: number) => void
  onCallCabo: () => void
  onUseAbility: (p: UseAbilityPayload) => void
  onSkipAbility: () => void
  onConfirmInitialPeek: (indices: number[]) => void
  onSnap: (idx: number) => void
  onSetAbility: (sel: Partial<GameState['abilitySelection']>) => void
  onClearAbility: () => void
  onNextRound: () => void
}

export default function GameBoard({
  gameState,
  onDrawDeck,
  onDrawDiscard,
  onDiscardDrawn,
  onSwap,
  onCallCabo,
  onUseAbility,
  onSkipAbility,
  onConfirmInitialPeek,
  onSnap,
  onSetAbility,
  onClearAbility,
  onNextRound,
}: GameBoardProps) {
  const { view, peekReveals, abilitySelection } = gameState
  if (!view) return null

  const myPlayer = view.players.find((p) => p.id === view.myPlayerId)!
  const others = view.players.filter((p) => p.id !== view.myPlayerId)
  const isMyTurn = view.currentPlayerId === view.myPlayerId
  const isHost = myPlayer?.isHost ?? false

  const canSnap = (view.phase === 'draw' || view.phase === 'act') && view.discardTop !== null

  // ── Ability: select own card ──────────────────────────────────────────────
  const handleAbilitySelectOwn = useCallback((cardIndex: number) => {
    onSetAbility({ ownCardIndex: cardIndex })
  }, [onSetAbility])

  // ── Ability: select opponent's card ──────────────────────────────────────
  const handleSelectTarget = useCallback((playerId: string, cardIndex: number) => {
    onSetAbility({ targetPlayerId: playerId, targetCardIndex: cardIndex })
  }, [onSetAbility])

  // ── Build & fire ability payload ──────────────────────────────────────────
  const handleUseAbility = useCallback(() => {
    const ab = view.pendingAbility
    const sel = abilitySelection
    if (!ab) return

    let payload: UseAbilityPayload | null = null

    switch (ab.type) {
      case 'peek-own':
        if (sel.ownCardIndex === null) return
        payload = { type: 'peek-own', cardIndex: sel.ownCardIndex }
        break
      case 'peek-opponent':
        if (sel.targetPlayerId === null || sel.targetCardIndex === null) return
        payload = { type: 'peek-opponent', targetPlayerId: sel.targetPlayerId, cardIndex: sel.targetCardIndex }
        break
      case 'blind-swap':
        if (sel.ownCardIndex === null || sel.targetPlayerId === null || sel.targetCardIndex === null) return
        payload = { type: 'blind-swap', ownCardIndex: sel.ownCardIndex, targetPlayerId: sel.targetPlayerId, targetCardIndex: sel.targetCardIndex }
        break
      case 'king': {
        if (sel.targetPlayerId === null || sel.targetCardIndex === null) return
        const shouldSwap = sel.ownCardIndex !== null
        payload = { type: 'king', targetPlayerId: sel.targetPlayerId, targetCardIndex: sel.targetCardIndex, swap: shouldSwap, ownCardIndex: sel.ownCardIndex ?? undefined }
        break
      }
    }

    if (payload) {
      onUseAbility(payload)
      onClearAbility()
    }
  }, [view.pendingAbility, abilitySelection, onUseAbility, onClearAbility])

  // ── Build peer peek reveal maps ───────────────────────────────────────────
  function getPeekRevealsFor(playerId: string) {
    const out: Record<string, import('@cabo/shared').CardData> = {}
    for (const [key, result] of Object.entries(peekReveals)) {
      if (result.targetPlayerId === playerId) {
        out[String(result.cardIndex)] = result.card
      }
    }
    return out
  }

  const myPeekReveals = getPeekRevealsFor(view.myPlayerId)

  return (
    <div className="min-h-screen flex flex-col bg-felt-dark">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-felt-dark/80 border-b border-white/5">
        <span className="text-white font-bold text-lg">Cabo</span>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">Round {view.round}</span>
          {view.caboCallerId && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full"
            >
              CABO called!
            </motion.span>
          )}
        </div>
        {/* Scores */}
        <div className="flex gap-2">
          {view.players.map((p) => (
            <div key={p.id} className="text-right">
              <div className="text-xs text-white/50">{p.name}</div>
              <div className={`text-sm font-bold ${p.totalScore >= 80 ? 'text-red-400' : 'text-white'}`}>
                {p.totalScore}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main board */}
      <div className="flex-1 flex flex-col items-center justify-between py-6 px-4 gap-6">
        {/* Other players (top arc) */}
        <div
          className="w-full flex justify-center gap-4 flex-wrap"
          style={{ maxWidth: 700 }}
        >
          {others.map((p) => (
            <OtherPlayer
              key={p.id}
              player={p}
              isCurrentTurn={view.currentPlayerId === p.id}
              peekReveals={getPeekRevealsFor(p.id)}
              phase={view.phase}
              pendingAbility={view.pendingAbility}
              isMyTurn={isMyTurn}
              abilitySelection={abilitySelection}
              onSelectCard={handleSelectTarget}
              caboCallerId={view.caboCallerId}
            />
          ))}
        </div>

        {/* Center: deck + discard */}
        <CenterPile
          deckCount={view.deckCount}
          discardTop={view.discardTop}
          canDraw={isMyTurn && view.phase === 'draw'}
          canDrawDiscard={isMyTurn && view.phase === 'draw' && view.discardTop !== null}
          onDrawDeck={onDrawDeck}
          onDrawDiscard={onDrawDiscard}
        />

        {/* Action panel */}
        <ActionPanel
          view={view}
          isMyTurn={isMyTurn}
          abilitySelection={abilitySelection}
          onCallCabo={onCallCabo}
          onDiscardDrawn={onDiscardDrawn}
          onConfirmInitialPeek={onConfirmInitialPeek}
          onUseAbility={handleUseAbility}
          onSkipAbility={onSkipAbility}
          onClearAbilitySelection={onClearAbility}
        />

        {/* My hand (bottom) */}
        <PlayerHand
          cards={myPlayer?.cards ?? [null, null, null, null]}
          peekReveals={myPeekReveals}
          phase={view.phase}
          isMyTurn={isMyTurn}
          drawnCard={view.drawnCard}
          pendingAbility={view.pendingAbility}
          abilitySelection={abilitySelection}
          canSnap={canSnap}
          onSnap={onSnap}
          onSwap={onSwap}
          onAbilitySelectOwn={handleAbilitySelectOwn}
        />
      </div>

      {/* Round end overlay */}
      <AnimatePresence>
        {view.roundEndData && (
          <RoundEnd
            key="round-end"
            data={view.roundEndData}
            myPlayerId={view.myPlayerId}
            isHost={isHost}
            onNextRound={onNextRound}
          />
        )}
      </AnimatePresence>

      <RulesPanel />
    </div>
  )
}
