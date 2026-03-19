'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '@/lib/socket'
import type {
  GameView,
  PeekResult,
  UseAbilityPayload,
  RoomInfo,
} from '@cabo/shared'

export interface Toast { id: number; message: string; type: 'info' | 'error' }

export interface GameState {
  view: GameView | null
  roomInfo: RoomInfo | null
  toasts: Toast[]
  /** transient peek reveals keyed by `${playerId}-${cardIndex}` */
  peekReveals: Record<string, PeekResult>
  /** UI state for ability targeting */
  abilitySelection: {
    ownCardIndex: number | null
    targetPlayerId: string | null
    targetCardIndex: number | null
  }
  connected: boolean
}

let toastId = 0

export function useGame() {
  const [state, setState] = useState<GameState>({
    view: null,
    roomInfo: null,
    toasts: [],
    peekReveals: {},
    abilitySelection: { ownCardIndex: null, targetPlayerId: null, targetCardIndex: null },
    connected: false,
  })

  const peekTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setState((s) => ({ ...s, toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    socket.on('connect', () => setState((s) => ({ ...s, connected: true })))
    socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })))

    socket.on('game:view', (view) => {
      setState((s) => ({ ...s, view }))
    })

    socket.on('room:info', (roomInfo) => {
      setState((s) => ({ ...s, roomInfo }))
    })

    socket.on('game:error', (msg) => addToast(msg, 'error'))
    socket.on('game:toast', (msg) => addToast(msg, 'info'))

    socket.on('game:peek-result', (result) => {
      const key = `${result.targetPlayerId}-${result.cardIndex}`
      setState((s) => ({ ...s, peekReveals: { ...s.peekReveals, [key]: result } }))
      // Clear after 5 s
      if (peekTimers.current[key]) clearTimeout(peekTimers.current[key])
      peekTimers.current[key] = setTimeout(() => {
        setState((s) => {
          const reveals = { ...s.peekReveals }
          delete reveals[key]
          return { ...s, peekReveals: reveals }
        })
      }, 5000)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('game:view')
      socket.off('room:info')
      socket.off('game:error')
      socket.off('game:toast')
      socket.off('game:peek-result')
    }
  }, [addToast])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const createRoom = useCallback(
    (playerName: string): Promise<{ roomId: string; playerId: string }> => {
      const socket = getSocket()
      return new Promise((resolve, reject) => {
        socket.emit('room:create', { playerName }, (res) => {
          if (!res.ok) reject(new Error(res.error))
          else {
            localStorage.setItem('cabo_playerId', res.playerId!)
            localStorage.setItem('cabo_playerName', playerName)
            resolve({ roomId: res.roomId!, playerId: res.playerId! })
          }
        })
      })
    },
    []
  )

  const joinRoom = useCallback(
    (roomId: string, playerName: string): Promise<void> => {
      const socket = getSocket()
      const existingId = localStorage.getItem('cabo_playerId') ?? undefined
      return new Promise((resolve, reject) => {
        socket.emit('room:join', { roomId, playerName, playerId: existingId }, (res) => {
          if (!res.ok) reject(new Error(res.error))
          else {
            localStorage.setItem('cabo_playerId', res.playerId!)
            localStorage.setItem('cabo_playerName', playerName)
            resolve()
          }
        })
      })
    },
    []
  )

  const setReady = useCallback(() => {
    getSocket().emit('game:ready', (res) => {
      if (!res.ok) addToast(res.error!, 'error')
    })
  }, [addToast])

  const startGame = useCallback(() => {
    getSocket().emit('game:start', (res) => {
      if (!res.ok) addToast(res.error!, 'error')
    })
  }, [addToast])

  const confirmInitialPeek = useCallback((indices: number[]) => {
    getSocket().emit('game:initial-peek-done', indices)
  }, [])

  const drawDeck = useCallback(() => getSocket().emit('game:draw-deck'), [])
  const drawDiscard = useCallback(() => getSocket().emit('game:draw-discard'), [])
  const discardDrawn = useCallback(() => getSocket().emit('game:discard-drawn'), [])
  const swap = useCallback((idx: number) => getSocket().emit('game:swap', idx), [])
  const callCabo = useCallback(() => getSocket().emit('game:cabo'), [])
  const useAbility = useCallback((p: UseAbilityPayload) => getSocket().emit('game:use-ability', p), [])
  const skipAbility = useCallback(() => getSocket().emit('game:skip-ability'), [])
  const snap = useCallback((cardIndex: number) => getSocket().emit('game:snap', cardIndex), [])

  const setAbilitySelection = useCallback(
    (sel: Partial<GameState['abilitySelection']>) => {
      setState((s) => ({
        ...s,
        abilitySelection: { ...s.abilitySelection, ...sel },
      }))
    },
    []
  )

  const clearAbilitySelection = useCallback(() => {
    setState((s) => ({
      ...s,
      abilitySelection: { ownCardIndex: null, targetPlayerId: null, targetCardIndex: null },
    }))
  }, [])

  const dismissToast = useCallback((id: number) => {
    setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }))
  }, [])

  return {
    ...state,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    confirmInitialPeek,
    drawDeck,
    drawDiscard,
    discardDrawn,
    swap,
    callCabo,
    useAbility,
    skipAbility,
    snap,
    setAbilitySelection,
    clearAbilitySelection,
    dismissToast,
  }
}
