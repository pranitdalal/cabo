import type { CardData, Suit, Rank, AbilityType } from '@cabo/shared'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function cardValue(rank: Rank, suit: Suit | null): number {
  if (rank === 'JOKER') return -2
  if (rank === 'A') return 1
  if (rank === 'J') return 11
  if (rank === 'Q') return 12
  if (rank === 'K') return suit === 'hearts' || suit === 'diamonds' ? 0 : 13
  return parseInt(rank, 10)
}

export function createShuffledDeck(): CardData[] {
  const cards: CardData[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}-${rank}`, suit, rank, value: cardValue(rank, suit) })
    }
  }
  cards.push({ id: 'joker-0', suit: null, rank: 'JOKER', value: -2 })
  cards.push({ id: 'joker-1', suit: null, rank: 'JOKER', value: -2 })
  return shuffle(cards)
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function getAbilityType(card: CardData): AbilityType | null {
  const { rank } = card
  if (rank === '7' || rank === '8') return 'peek-own'
  if (rank === '9' || rank === '10') return 'peek-opponent'
  if (rank === 'J' || rank === 'Q') return 'blind-swap'
  if (rank === 'K') return 'king'
  return null
}
