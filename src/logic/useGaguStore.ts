import { create } from 'zustand';
import { GaguState, Card } from '@/types/game';
import { createDeck, shuffleDeck, dealFromDeck } from '@/data/deck';
import { calculateGaguScore, determineDealerAction, determineGaguWinner } from './engine/gagu';

const INITIAL_STATE: Omit<GaguState, 
  'initGagu' | 'dealCards' | 'hit' | 'stand' | 'executeDealerTurn' | 
  'evaluateGagu' | 'nextRound' | 'resetGagu' | 'setBetAmount' | 'restartGagu'
> = {
  deck: [],
  player: null,
  dealer: null,
  gamePhase: 'INIT',
  winnerId: null,
  roundNumber: 0,
  betAmount: 100,
  currentRoundBet: 100,
};

export const useGaguStore = create<GaguState>((set, get) => ({
  ...INITIAL_STATE,

  initGagu: () => {
    set({
      ...INITIAL_STATE,
      gamePhase: 'INIT',
      roundNumber: 0,
      player: {
        id: 'player-0',
        isDealer: false,
        cards: [],
        score: 0,
        hasStood: false,
        chips: 1000,
      },
      dealer: {
        id: 'dealer',
        isDealer: true,
        cards: [],
        score: 0,
        hasStood: false,
        chips: 1000,
      },
    });
  },

  dealCards: () => {
    const { betAmount, player, dealer } = get();
    
    // Check if players have enough chips
    const currentChipsPlayer = player?.chips ?? 1000;
    const currentChipsDealer = dealer?.chips ?? 1000;
    if (currentChipsPlayer <= 0 || currentChipsDealer <= 0) return;

    let deck = shuffleDeck(createDeck());
    const currentRoundBet = betAmount;

    // Deal 2 cards to player, 2 cards to dealer
    const playerDeal = dealFromDeck(deck, 2);
    deck = playerDeal.remaining;
    
    const dealerDeal = dealFromDeck(deck, 2);
    deck = dealerDeal.remaining;

    set({
      deck,
      player: {
        id: 'player-0',
        isDealer: false,
        cards: playerDeal.dealt,
        score: calculateGaguScore(playerDeal.dealt),
        hasStood: false,
        chips: currentChipsPlayer - currentRoundBet,
      },
      dealer: {
        id: 'dealer',
        isDealer: true,
        cards: dealerDeal.dealt,
        score: calculateGaguScore(dealerDeal.dealt),
        hasStood: false,
        chips: currentChipsDealer - currentRoundBet,
      },
      gamePhase: 'PLAYER_ACTION',
      winnerId: null,
      roundNumber: get().roundNumber + 1,
      currentRoundBet,
    });
  },

  hit: () => {
    const { player, deck, gamePhase } = get();
    if (gamePhase !== 'PLAYER_ACTION' || !player || player.hasStood || player.cards.length >= 3) return;

    const { dealt, remaining } = dealFromDeck(deck, 1);
    const newCards = [...player.cards, ...dealt];
    
    const updatedPlayer = {
      ...player,
      cards: newCards,
      score: calculateGaguScore(newCards),
      hasStood: newCards.length >= 3, // Auto stand on 3 cards
    };

    set({
      player: updatedPlayer,
      deck: remaining,
      gamePhase: updatedPlayer.hasStood ? 'DEALER_ACTION' : 'PLAYER_ACTION',
    });

    // If player auto-stood, trigger dealer action
    if (updatedPlayer.hasStood) {
      setTimeout(() => {
        get().executeDealerTurn();
      }, 1000);
    }
  },

  stand: () => {
    const { player, gamePhase } = get();
    if (gamePhase !== 'PLAYER_ACTION' || !player) return;

    set({
      player: { ...player, hasStood: true },
      gamePhase: 'DEALER_ACTION',
    });

    setTimeout(() => {
      get().executeDealerTurn();
    }, 1000);
  },

  executeDealerTurn: () => {
    const { dealer, deck, gamePhase } = get();
    if (gamePhase !== 'DEALER_ACTION' || !dealer) return;

    const action = determineDealerAction(dealer.cards);
    
    if (action === 'HIT') {
      const { dealt, remaining } = dealFromDeck(deck, 1);
      const newCards = [...dealer.cards, ...dealt];
      set({
        dealer: {
          ...dealer,
          cards: newCards,
          score: calculateGaguScore(newCards),
          hasStood: true,
        },
        deck: remaining,
        gamePhase: 'SHOWDOWN',
      });
    } else {
      set({
        dealer: { ...dealer, hasStood: true },
        gamePhase: 'SHOWDOWN',
      });
    }

    setTimeout(() => {
      get().evaluateGagu();
    }, 1200);
  },

  evaluateGagu: () => {
    const { player, dealer, gamePhase, currentRoundBet } = get();
    if (gamePhase !== 'SHOWDOWN' || !player || !dealer) return;

    const winner = determineGaguWinner(player.score, dealer.score);
    
    let updatedPlayerChips = player.chips;
    let updatedDealerChips = dealer.chips;

    const pot = currentRoundBet * 2;

    if (winner === 'PLAYER') {
      updatedPlayerChips += pot;
    } else if (winner === 'DEALER') {
      updatedDealerChips += pot;
    } else {
      // Draw: return bets
      updatedPlayerChips += currentRoundBet;
      updatedDealerChips += currentRoundBet;
    }

    set({
      winnerId: winner === 'DRAW' ? 'DRAW' : (winner === 'PLAYER' ? player.id : dealer.id),
      player: { ...player, chips: updatedPlayerChips },
      dealer: { ...dealer, chips: updatedDealerChips },
      gamePhase: 'RESULT',
    });
  },

  nextRound: () => {
    get().dealCards();
  },

  resetGagu: () => {
    set({ ...INITIAL_STATE });
  },

  setBetAmount: (amount: number) => {
    const { gamePhase, player, dealer, currentRoundBet } = get();
    if (!player || !dealer) return;

    // Check if it's before any action (first PLAYER_ACTION with 2 cards and not stood)
    const isBeforeAction = 
      gamePhase === 'PLAYER_ACTION' && 
      player.cards.length === 2 && 
      !player.hasStood;

    if (isBeforeAction) {
      // Adjust current chip balances in real-time
      set({
        betAmount: amount,
        currentRoundBet: amount,
        player: {
          ...player,
          chips: player.chips + currentRoundBet - amount,
        },
        dealer: {
          ...dealer,
          chips: dealer.chips + currentRoundBet - amount,
        },
      });
    } else {
      // Standard change for the next round
      set({ betAmount: amount });
    }
  },

  restartGagu: () => {
    set({
      player: {
        id: 'player-0',
        isDealer: false,
        cards: [],
        score: 0,
        hasStood: false,
        chips: 1000,
      },
      dealer: {
        id: 'dealer',
        isDealer: true,
        cards: [],
        score: 0,
        hasStood: false,
        chips: 1000,
      },
      roundNumber: 0,
      winnerId: null,
      gamePhase: 'INIT',
    });

    get().dealCards();
  },
}));
