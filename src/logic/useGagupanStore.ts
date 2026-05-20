import { create } from 'zustand';
import { GagupanState, Card, BettingSpotId, BettingSpot } from '@/types/game';
import { createDeck, shuffleDeck, dealFromDeck } from '@/data/deck';
import { calculateScore, shouldDrawThirdCard, processSettlement } from './engine/gagupan';

const INITIAL_SPOTS = (): Record<BettingSpotId, BettingSpot> => ({
  DONG: { id: 'DONG', cards: [], score: 0, bets: {} },
  SEO: { id: 'SEO', cards: [], score: 0, bets: {} },
  NAM: { id: 'NAM', cards: [], score: 0, bets: {} },
});

const INITIAL_STATE = {
  gamePhase: 'BETTING' as const,
  deck: [] as Card[],
  spots: INITIAL_SPOTS(),
  banker: { cards: [], score: 0 },
  playerBalances: { 'player-0': 10000 },
  winnerResults: {
    DONG: null,
    SEO: null,
    NAM: null,
  } as Record<BettingSpotId, 'WIN' | 'LOSE' | 'DRAW' | null>,
  betAmount: 100,
  roundNumber: 1,
};

export const useGagupanStore = create<GagupanState>((set, get) => ({
  ...INITIAL_STATE,

  initGagupan: () => {
    set({
      ...INITIAL_STATE,
      playerBalances: { 'player-0': 10000 },
    });
  },

  placeBet: (spotId: BettingSpotId, amount: number) => {
    const { playerBalances, spots, gamePhase } = get();
    if (gamePhase !== 'BETTING') return;

    const currentBalance = playerBalances['player-0'] || 0;
    if (currentBalance < amount) return; // 잔액 부족

    // 1. 유저 잔고 차감
    const newBalances = {
      ...playerBalances,
      'player-0': currentBalance - amount,
    };

    // 2. 베팅 구역 칩 누적
    const spot = spots[spotId];
    const newBets = {
      ...spot.bets,
      'player-0': (spot.bets['player-0'] || 0) + amount,
    };

    set({
      playerBalances: newBalances,
      spots: {
        ...spots,
        [spotId]: {
          ...spot,
          bets: newBets,
        },
      },
    });
  },

  clearBets: () => {
    const { playerBalances, spots, gamePhase } = get();
    if (gamePhase !== 'BETTING') return;

    // 현재 배팅된 금액 총합 구하기 및 환불
    let refundAmount = 0;
    const newSpots = INITIAL_SPOTS();

    (Object.keys(spots) as BettingSpotId[]).forEach((spotId) => {
      const userBet = spots[spotId].bets['player-0'] || 0;
      refundAmount += userBet;
    });

    const newBalances = {
      ...playerBalances,
      'player-0': (playerBalances['player-0'] || 0) + refundAmount,
    };

    set({
      playerBalances: newBalances,
      spots: newSpots,
    });
  },

  confirmBets: () => {
    const { spots, gamePhase } = get();
    if (gamePhase !== 'BETTING') return;

    // 배팅이 최소 하나라도 존재하는지 확인
    const hasBet = (Object.keys(spots) as BettingSpotId[]).some(
      (spotId) => (spots[spotId].bets['player-0'] || 0) > 0
    );

    if (!hasBet) return; // 베팅 없이 시작할 수 없음

    set({ gamePhase: 'DEAL' });
    // 카드 분배 단계로 전환
    setTimeout(() => {
      get().dealCards();
    }, 500);
  },

  dealCards: () => {
    const { spots } = get();
    let deck = shuffleDeck(createDeck(40)); // 40장 투전 덱 생성

    const spotIds: BettingSpotId[] = ['DONG', 'SEO', 'NAM'];
    const updatedSpots = { ...spots };

    // 1. 동, 서, 남 각 구역에 2장씩 분배
    spotIds.forEach((spotId) => {
      const { dealt, remaining } = dealFromDeck(deck, 2);
      deck = remaining;
      updatedSpots[spotId] = {
        ...updatedSpots[spotId],
        cards: dealt,
        score: calculateScore(dealt),
      };
    });

    // 2. Banker (북)에 2장 분배
    const bankerDeal = dealFromDeck(deck, 2);
    deck = bankerDeal.remaining;
    const updatedBanker = {
      cards: bankerDeal.dealt,
      score: calculateScore(bankerDeal.dealt),
    };

    set({
      deck,
      spots: updatedSpots,
      banker: updatedBanker,
      gamePhase: 'DRAW_PHASE',
    });

    // 3번째 카드 징구 비동기 단계 실행
    setTimeout(() => {
      get().processDraws();
    }, 1000);
  },

  processDraws: async () => {
    const { spots, banker, deck } = get();
    let currentDeck = [...deck];
    const spotIds: BettingSpotId[] = ['DONG', 'SEO', 'NAM'];
    const updatedSpots = { ...spots };
    let updatedBanker = { ...banker };

    // 순차적으로 추가 드로우 비동기 연출 (동 -> 서 -> 남 -> 북)
    for (const spotId of spotIds) {
      const spot = updatedSpots[spotId];
      if (shouldDrawThirdCard(spot.cards)) {
        const { dealt, remaining } = dealFromDeck(currentDeck, 1);
        currentDeck = remaining;
        const newCards = [...spot.cards, ...dealt];
        updatedSpots[spotId] = {
          ...spot,
          cards: newCards,
          score: calculateScore(newCards),
        };
        // 상태 갱신 및 화면에 딜레이 노출
        set({ spots: { ...updatedSpots }, deck: currentDeck });
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    // Banker (북)의 추가 드로우 여부 확인 및 분배
    if (shouldDrawThirdCard(updatedBanker.cards)) {
      const { dealt, remaining } = dealFromDeck(currentDeck, 1);
      currentDeck = remaining;
      const newCards = [...updatedBanker.cards, ...dealt];
      updatedBanker = {
        cards: newCards,
        score: calculateScore(newCards),
      };
      set({ banker: updatedBanker, deck: currentDeck });
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // 모든 드로우가 완료된 후 결과 계산
    set({ gamePhase: 'SETTLEMENT' });
    setTimeout(() => {
      get().evaluateGagupan();
    }, 1000);
  },

  evaluateGagupan: () => {
    const { spots, banker, playerBalances } = get();
    
    // 뱅커(북)와 각 구역의 결과를 비교하여 정산
    const report = processSettlement(spots, banker.score);

    // 유저 잔고에 정산 반영
    const currentBalance = playerBalances['player-0'] || 0;
    const change = report.balanceChanges['player-0'] || 0;
    const newBalance = Math.max(0, currentBalance + change + (change > 0 ? (spots.DONG.bets['player-0'] || 0) + (spots.SEO.bets['player-0'] || 0) + (spots.NAM.bets['player-0'] || 0) : 0));
    
    // 잠깐! 베팅금을 돌려받는 로직 수정: 
    // processSettlement에서 WIN 시 balanceChanges에 +betAmount를 더했고, LOSE 시 -betAmount를 더했다.
    // user가 베팅할 때 이미 playerBalances에서 베팅금이 차감되었다.
    // WIN일 때는 베팅금(원금) + 베팅금(1:1배당) = 총 2배를 돌려받아야 한다.
    // LOSE일 때는 아무것도 받지 못한다. (원금 상실)
    // DRAW일 때는 베팅금(원금)만 돌려받아야 한다.
    // Let's check processSettlement again:
    // WIN: balanceChanges[playerId] += betAmount;
    // LOSE: balanceChanges[playerId] -= betAmount;
    // DRAW: 0
    //
    // 따라서, processSettlement에서:
    // 베팅 시 이미 유저 지갑에서 betAmount가 빠져나갔다.
    // balanceChanges가:
    // WIN: +betAmount  =>  지갑 복구하려면?
    // 실제 받아야 하는 칩은:
    // WIN: 2 * betAmount (원금 + 1배당금)
    // LOSE: 0
    // DRAW: 1 * betAmount (원금 돌려받음)
    //
    // 그럼, 지갑 복구 계산식:
    // `newBalance = currentBalance + (원래 베팅한 총 금액) + balanceChanges['player-0']`
    // 검증:
    // 100원 베팅함. 지갑: 10000 -> 9900.
    // WIN: balanceChanges = +100.
    // newBalance = 9900 + 100(베팅총액) + 100 = 10100. (원금 100 복구 + 100 획득 = 10100. 정확함!)
    // LOSE: balanceChanges = -100.
    // newBalance = 9900 + 100(베팅총액) + (-100) = 9900. (원금 날아감. 정확함!)
    // DRAW: balanceChanges = 0.
    // newBalance = 9900 + 100(베팅총액) + 0 = 10000. (원금 복구. 정확함!)
    //
    // 이 계산식 아주 좋다!
    // 원래 베팅한 총 금액 계산:
    let totalBet = 0;
    (Object.keys(spots) as BettingSpotId[]).forEach((spotId) => {
      totalBet += spots[spotId].bets['player-0'] || 0;
    });

    const changeAmount = report.balanceChanges['player-0'] || 0;
    const finalBalance = currentBalance + totalBet + changeAmount;

    set({
      playerBalances: {
        ...playerBalances,
        'player-0': finalBalance,
      },
      winnerResults: report.spotResults,
      gamePhase: 'RESULT',
    });
  },

  nextRound: () => {
    const { roundNumber } = get();
    set({
      gamePhase: 'BETTING',
      spots: INITIAL_SPOTS(),
      banker: { cards: [], score: 0 },
      winnerResults: {
        DONG: null,
        SEO: null,
        NAM: null,
      },
      roundNumber: roundNumber + 1,
    });
  },

  resetGagupan: () => {
    set({
      ...INITIAL_STATE,
      playerBalances: { 'player-0': 10000 },
    });
  },
}));
