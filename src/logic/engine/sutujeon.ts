import { Card, CardSuit, CurrentTrick } from '@/types/game';

/**
 * 문양 종류에 따른 카드의 실제 상대적 위력을 계산하는 헬퍼 함수
 */
export function getCardPower(card: Card): number {
  // 어떤 문양이든 장(10)은 최고 존엄이므로 가장 높은 파워(11) 부여
  if (card.rank === 10) return 11; 

  const highWinsSuits: CardSuit[] = ['PERSON', 'FISH', 'BIRD', 'PHEASANT'];
  
  if (highWinsSuits.includes(card.suit)) {
    // 숫자가 클수록 강함 (9는 10점, 8은 9점 ... 1은 2점)
    return card.rank + 1;
  } else {
    // 숫자가 작을수록 강함 (1은 10점, 2는 9점 ... 9는 2점)
    return (10 - card.rank) + 1;
  }
}

/**
 * 이번 트릭에서 어떤 플레이어가 승리했는지 판정
 */
export function evaluateTrickWinner(trick: CurrentTrick): string {
  const { ledSuit, actions } = trick;
  if (!ledSuit || actions.length < 4) throw new Error("Trick is not complete");

  let highestPower = -1;
  let winnerId = '';

  for (const action of actions) {
    // 선이 낸 문양(Led Suit)과 일치하는 카드만 승리 자격이 있음
    if (action.card.suit === ledSuit) {
      const power = getCardPower(action.card);
      if (power > highestPower) {
        highestPower = power;
        winnerId = action.playerId;
      }
    }
  }

  return winnerId;
}

/**
 * Bot plays a valid card.
 * Must follow ledSuit if available.
 */
export function botSelectCard(cards: Card[], ledSuit: CardSuit | null): Card {
  if (!ledSuit) {
    // Lead arbitrarily (pick a random card)
    const idx = Math.floor(Math.random() * cards.length);
    return cards[idx];
  }

  // Must follow suit
  const matchingSuits = cards.filter(c => c.suit === ledSuit);
  if (matchingSuits.length > 0) {
    const idx = Math.floor(Math.random() * matchingSuits.length);
    return matchingSuits[idx];
  }

  // Cannot follow suit, discard any
  const idx = Math.floor(Math.random() * cards.length);
  return cards[idx];
}
