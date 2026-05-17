// ============================================================
// Tujeon (투전) — 40-Card Deck Utilities
// ============================================================

import { Card, CardSuit } from '@/types/game';

const SUITS_4: CardSuit[] = ['PERSON', 'FISH', 'BIRD', 'PHEASANT'];
const SUITS_8: CardSuit[] = ['PERSON', 'FISH', 'BIRD', 'PHEASANT', 'STAR', 'HORSE', 'DEER', 'RABBIT'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Creates the Tujeon deck.
 * Supports 40 cards (4 suits) or 80 cards (8 suits).
 */
export function createDeck(size: 40 | 80 = 40): Card[] {
  const deck: Card[] = [];
  const suitsToUse = size === 80 ? SUITS_8 : SUITS_4;

  for (const suit of suitsToUse) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        imageUrl: '', // Reserved for illustrated art
      });
    }
  }

  return deck;
}

/**
 * Fisher-Yates shuffle — returns a new shuffled copy.
 * Does not mutate the original array.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals `count` cards from the top of the deck.
 * Returns the dealt cards and the remaining deck.
 */
export function dealFromDeck(
  deck: Card[],
  count: number
): { dealt: Card[]; remaining: Card[] } {
  if (count > deck.length) {
    throw new Error(
      `Cannot deal ${count} cards from a deck of ${deck.length}`
    );
  }
  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

/**
 * Finds a card in an array by its ID.
 */
export function findCardById(cards: Card[], id: string): Card | undefined {
  return cards.find((c) => c.id === id);
}
