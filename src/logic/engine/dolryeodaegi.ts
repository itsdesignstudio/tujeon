// ============================================================
// Tujeon (투전) — 돌려대기 (Dolryeo-daegi) Rule Engine
// ============================================================

import { Card, EvaluationResult, JokboType } from '@/types/game';
import { combinations, complement } from './combinations';

// ── Jokbo Score Weights ──
// Ensures strict total ordering:
// 장땡(1000) > 9땡(109) > ... > 1땡(101) > 가보(90) > 8끗(18) > ... > 1끗(11) > 망(0)

const JANG_TTAENG_SCORE = 1000;
const TTAENG_BASE = 100;     // + rank (1–9)
const GABO_SCORE = 90;
const KKUT_BASE = 10;        // + last digit (1–8)
const MANG_SCORE = 0;

/**
 * Calculates the jokbo (족보) for two remaining cards.
 * Returns the jokbo type, numeric score, and human-readable label.
 */
export function calculateJokbo(card1: Card, card2: Card): {
  jokboType: JokboType;
  jokboScore: number;
  jokboLabel: string;
} {
  const r1 = card1.rank;
  const r2 = card2.rank;

  // 장땡 — both cards are 장 (rank 10)
  if (r1 === 10 && r2 === 10) {
    return {
      jokboType: 'JANG_TTAENG',
      jokboScore: JANG_TTAENG_SCORE,
      jokboLabel: '장땡',
    };
  }

  // 땡 — pair (same rank, but not both 10)
  if (r1 === r2) {
    return {
      jokboType: 'TTAENG',
      jokboScore: TTAENG_BASE + r1,
      jokboLabel: `${r1}땡`,
    };
  }

  // Sum-based jokbo
  const sum = r1 + r2;
  const lastDigit = sum % 10;

  // 가보 — last digit is 9
  if (lastDigit === 9) {
    return {
      jokboType: 'GABO',
      jokboScore: GABO_SCORE,
      jokboLabel: '가보',
    };
  }

  // 망 — last digit is 0
  if (lastDigit === 0) {
    return {
      jokboType: 'MANG',
      jokboScore: MANG_SCORE,
      jokboLabel: '망',
    };
  }

  // 끗 — last digit is 1–8
  return {
    jokboType: 'KKUT',
    jokboScore: KKUT_BASE + lastDigit,
    jokboLabel: `${lastDigit}끗`,
  };
}

/**
 * Evaluates a 5-card Dolryeo-daegi hand.
 *
 * 1. Enumerates all C(5,3) = 10 combinations of 3 cards.
 * 2. For each, checks if the 3-card sum is a multiple of 10.
 * 3. If valid, calculates the jokbo of the remaining 2 cards.
 * 4. Returns the combination with the highest jokboScore.
 * 5. If no valid combination exists, returns isHwang = true (황).
 */
export function evaluateDolryeodaegiHand(cards: Card[]): EvaluationResult {
  if (cards.length !== 5) {
    throw new Error(`Expected 5 cards, got ${cards.length}`);
  }

  let bestResult: EvaluationResult | null = null;

  // Generate all C(5,3) = 10 combinations
  const combos = combinations(cards, 3);

  for (const combo3 of combos) {
    const sum3 = combo3.reduce((acc, c) => acc + c.rank, 0);

    // Check if sum is a multiple of 10 (10, 20, or 30)
    if (sum3 % 10 !== 0) continue;

    // Get the remaining 2 cards
    const remaining2 = complement(cards, combo3);
    if (remaining2.length !== 2) continue;

    // Calculate jokbo for remaining 2
    const jokbo = calculateJokbo(remaining2[0], remaining2[1]);

    const result: EvaluationResult = {
      isHwang: false,
      combination3: combo3,
      remaining2,
      jokboType: jokbo.jokboType,
      jokboScore: jokbo.jokboScore,
      jokboLabel: jokbo.jokboLabel,
    };

    // Keep the best (highest score) combination
    if (bestResult === null || result.jokboScore > bestResult.jokboScore) {
      bestResult = result;
    }
  }

  // No valid combination found → 황 (Hwang)
  if (bestResult === null) {
    return {
      isHwang: true,
      combination3: [],
      remaining2: cards.slice(0, 2), // arbitrary
      jokboType: 'MANG',
      jokboScore: -1, // Below even 망(0)
      jokboLabel: '황',
    };
  }

  return bestResult;
}

/**
 * Compares two evaluation results.
 * Returns:
 *  - positive if `a` wins
 *  - negative if `b` wins
 *  - 0 if tie
 *
 * 황 (Hwang) always loses to any valid hand.
 */
export function compareHands(
  a: EvaluationResult,
  b: EvaluationResult
): number {
  // 황 vs 황 = tie
  if (a.isHwang && b.isHwang) return 0;
  // 황 always loses
  if (a.isHwang) return -1;
  if (b.isHwang) return 1;

  return a.jokboScore - b.jokboScore;
}

/**
 * Bot AI: Greedy strategy.
 * Evaluates the hand and returns the IDs of the 3 cards
 * that form the best combination.
 * Returns null if the hand is 황 (no valid combination).
 */
export function botSelectCombination(cards: Card[]): string[] | null {
  const result = evaluateDolryeodaegiHand(cards);
  if (result.isHwang) return null;
  return result.combination3.map((c) => c.id);
}
