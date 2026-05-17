import { Card } from '@/types/game';

/**
 * 가구(Gagu) 게임의 패 점수를 계산합니다.
 * @param cards 플레이어가 들고 있는 카드 배열 (2장 또는 3장)
 * @returns 0 ~ 9 사이의 정수 (1의 자리 끗수)
 */
export function calculateGaguScore(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  
  // 1. 카드의 rank를 모두 더함 (Jang은 10으로 취급, 즉 rank 그대로 사용)
  const sum = cards.reduce((acc, card) => acc + card.rank, 0);
  
  // 2. 합계 % 10 의 결과를 리턴
  return sum % 10;
}

/**
 * 딜러의 자동 플레이 로직
 * @param dealerCards 딜러의 현재 카드 배열
 * @returns 'HIT' 또는 'STAND'
 */
export function determineDealerAction(dealerCards: Card[]): 'HIT' | 'STAND' {
  // 최대 3장 제약
  if (dealerCards.length >= 3) return 'STAND';
  
  // 규칙: 딜러는 점수가 5 이하이면 무조건 HIT(한 장 더 받음), 6 이상이면 STAND
  const currentScore = calculateGaguScore(dealerCards);
  return currentScore <= 5 ? 'HIT' : 'STAND';
}

/**
 * 승패 판정 로직
 */
export function determineGaguWinner(playerScore: number, dealerScore: number): 'PLAYER' | 'DEALER' | 'DRAW' {
  if (playerScore > dealerScore) return 'PLAYER';
  if (playerScore < dealerScore) return 'DEALER';
  return 'DRAW'; // 무승부
}
