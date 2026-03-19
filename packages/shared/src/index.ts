// ─── Card types ───────────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'JOKER'

export interface CardData {
  id: string
  suit: Suit | null
  rank: Rank
  value: number
}

// null = face-down / unknown from the viewer's perspective
export type CardView = CardData | null

// ─── Ability types ─────────────────────────────────────────────────────────────

export type AbilityType = 'peek-own' | 'peek-opponent' | 'blind-swap' | 'king'

export type UseAbilityPayload =
  | { type: 'peek-own'; cardIndex: number }
  | { type: 'peek-opponent'; targetPlayerId: string; cardIndex: number }
  | { type: 'blind-swap'; ownCardIndex: number; targetPlayerId: string; targetCardIndex: number }
  | { type: 'king'; targetPlayerId: string; targetCardIndex: number; swap: boolean; ownCardIndex?: number }

// ─── Game phases ────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'
  | 'initial-peek'
  | 'draw'
  | 'act'
  | 'ability'
  | 'round-end'
  | 'game-over'

// ─── Player view (personalised per recipient) ──────────────────────────────────

export interface PlayerView {
  id: string
  name: string
  isHost: boolean
  isConnected: boolean
  isReady: boolean
  /** cards[i] is null when face-down / unknown to the recipient */
  cards: CardView[]
  totalScore: number
  isEliminated: boolean
  /** only set for the local player — indices they've peeked */
  knownIndices?: number[]
}

// ─── Pending ability context ────────────────────────────────────────────────────

export interface PendingAbility {
  type: AbilityType
  cardThatTriggered: CardData
}

// ─── Round-end reveal ───────────────────────────────────────────────────────────

export interface RoundPlayerResult {
  playerId: string
  playerName: string
  cards: CardData[]
  roundScore: number
  caboBonus: number      // +10 if caller didn't win
  totalScoreAfter: number
  eliminated: boolean
}

export interface RoundEndData {
  results: RoundPlayerResult[]
  caboCallerId: string
  roundWinnerId: string    // lowest score
  gameOver: boolean
  gameWinnerId?: string
}

// ─── Full game view (sent to each player) ──────────────────────────────────────

export interface GameView {
  roomId: string
  phase: GamePhase
  players: PlayerView[]
  myPlayerId: string
  currentPlayerId: string
  caboCallerId: string | null
  deckCount: number
  discardTop: CardData | null
  /** only populated for the active player after they draw */
  drawnCard: CardData | null
  round: number
  pendingAbility: PendingAbility | null
  roundEndData: RoundEndData | null
  initialPeekDone: boolean    // has THIS player confirmed peek
}

// ─── Room info (lobby) ─────────────────────────────────────────────────────────

export interface RoomPlayerInfo {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  isConnected: boolean
}

export interface RoomInfo {
  roomId: string
  players: RoomPlayerInfo[]
}

// ─── Peek result (transient reveal from ability) ────────────────────────────────

export interface PeekResult {
  targetPlayerId: string
  cardIndex: number
  card: CardData
}

// ─── Socket event maps ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'game:view': (view: GameView) => void
  'game:error': (message: string) => void
  'game:toast': (message: string) => void
  'game:peek-result': (data: PeekResult) => void
  'room:info': (info: RoomInfo) => void
}

export interface AckResponse {
  ok: boolean
  error?: string
}

export interface CreateRoomResponse {
  ok: boolean
  roomId?: string
  playerId?: string
  error?: string
}

export interface JoinRoomResponse {
  ok: boolean
  playerId?: string
  error?: string
}

export interface ClientToServerEvents {
  'room:create': (
    data: { playerName: string },
    callback: (res: CreateRoomResponse) => void
  ) => void
  'room:join': (
    data: { roomId: string; playerName: string; playerId?: string },
    callback: (res: JoinRoomResponse) => void
  ) => void
  'game:ready': (callback: (res: AckResponse) => void) => void
  'game:start': (callback: (res: AckResponse) => void) => void
  'game:initial-peek-done': (cardIndices: number[]) => void
  'game:draw-deck': () => void
  'game:draw-discard': () => void
  'game:discard-drawn': () => void
  'game:swap': (cardIndex: number) => void
  'game:cabo': () => void
  'game:use-ability': (payload: UseAbilityPayload) => void
  'game:skip-ability': () => void
  'game:snap': (cardIndex: number) => void
}
