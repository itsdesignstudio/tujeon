import { Card, BettingSpot, BettingSpotId } from '@/types/game';

// 기존 가구 점수 계산식 재활용 (합산 % 10)
export function calculateScore(cards: Card[]): number {
  const sum = cards.reduce((acc, card) => acc + card.rank, 0);
  return sum % 10;
}

/**
 * 5점 이하일 때 자동으로 3번째 카드를 징구하는 로직
 */
export function shouldDrawThirdCard(cards: Card[]): boolean {
  if (cards.length >= 3) return false;
  const currentScore = calculateScore(cards);
  return currentScore <= 5; // 5점 이하면 조건부 한 장 더
}

/**
 * 물주와 각 구역의 결과를 비교하여 플레이어들의 칩 정산 데이터를 반환
 */
export interface SettlementReport {
  spotResults: Record<BettingSpotId, 'WIN' | 'LOSE' | 'DRAW'>;
  balanceChanges: Record<string, number>; // 플레이어별 획득/상실한 칩 계산
}

export function processSettlement(
  spots: Record<BettingSpotId, BettingSpot>,
  bankerScore: number
): SettlementReport {
  const spotResults: Record<BettingSpotId, 'WIN' | 'LOSE' | 'DRAW'> = {
    DONG: 'DRAW', SEO: 'DRAW', NAM: 'DRAW'
  };
  const balanceChanges: Record<string, number> = {};

  (Object.keys(spots) as BettingSpotId[]).forEach((spotId) => {
    const spot = spots[spotId];
    const spotScore = calculateScore(spot.cards);

    // 1. 구역별 승패 판정
    if (spotScore > bankerScore) spotResults[spotId] = 'WIN';
    else if (spotScore < bankerScore) spotResults[spotId] = 'LOSE';
    else spotResults[spotId] = 'DRAW';

    // 2. 해당 구역에 배팅한 유저들의 칩 정산
    Object.entries(spot.bets).forEach(([playerId, betAmount]) => {
      if (!balanceChanges[playerId]) balanceChanges[playerId] = 0;

      if (spotResults[spotId] === 'WIN') {
        balanceChanges[playerId] += betAmount; // 베팅금만큼 추가 획득 (1:1 배당)
      } else if (spotResults[spotId] === 'LOSE') {
        balanceChanges[playerId] -= betAmount; // 베팅금 상실
      }
      // DRAW인 경우 칩 변동 없음 (베팅금 돌려받음)
    });
  });

  return { spotResults, balanceChanges };
}
