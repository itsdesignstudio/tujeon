// ============================================================
// Tujeon (투전) — Zustand Game State Store
// ============================================================

import { create } from 'zustand';
import { GameState, GameMode, Player, Card, GamePhase, Difficulty } from '@/types/game';
import { createDeck, shuffleDeck, dealFromDeck } from '@/data/deck';
import {
  evaluateDolryeodaegiHand,
  calculateJokbo,
  compareHands,
  botSelectCombination,
} from '@/logic/engine/dolryeodaegi';

// ── Default Player Factory ──

function createPlayer(
  id: string,
  name: string,
  isBot: boolean,
  startScore: number = 1000
): Player {
  return {
    id,
    name,
    isBot,
    cards: [],
    selectedCardIds: [],
    isFolded: false,
    score: startScore,
    evaluation: null,
  };
}

// ── Initial State ──

const INITIAL_STATE: Omit<GameState, 
  'initGame' | 'dealCards' | 'toggleCardSelection' | 'confirmCombination' | 
  'evaluateHands' | 'declareHwang' | 'nextRound' | 'resetGame' | 'setBetAmount' | 'restartGame' |
  'setDifficulty' | 'startTimer' | 'tickTimer' | 'stopTimer' | 'handleTimeout'
> = {
  gameMode: 'DOLRYEO_DAEGI',
  deck: [],
  players: [],
  dealerIndex: 0,
  currentPlayerIndex: 0,
  gamePhase: 'LOBBY',
  winnerId: null,
  roundNumber: 0,
  betAmount: 100,
  currentRoundBet: 100,
  difficulty: 'EASY',
  timeLeft: null,
  isTimerRunning: false,
};

// ── Store ──

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL_STATE,

  /**
   * Initialize a new game session.
   * Creates players (1 human + N-1 bots) and prepares the deck.
   */
  initGame: (mode: GameMode, playerCount: number) => {
    const players: Player[] = [
      createPlayer('player-0', '나', false),
    ];

    for (let i = 1; i < playerCount; i++) {
      const botNames = ['상대', '봇 2', '봇 3', '봇 4'];
      players.push(
        createPlayer(`player-${i}`, botNames[i - 1] || `봇 ${i}`, true)
      );
    }

    set({
      gameMode: mode,
      players,
      deck: createDeck(),
      dealerIndex: 0,
      currentPlayerIndex: 0,
      gamePhase: 'LOBBY',
      winnerId: null,
      roundNumber: 0,
    });
  },

  /**
   * Shuffle the deck and deal 5 cards to each player.
   * Transitions: LOBBY → DEAL → MAKE_COMBINATION
   */
  dealCards: () => {
    const { players, betAmount } = get();
    let deck = shuffleDeck(createDeck());

    // 딜을 돌리는 시점의 최신 betAmount를 이 라운드의 실질 판돈(currentRoundBet)으로 기록
    const currentRoundBet = betAmount;

    const updatedPlayers = players.map((player) => {
      const { dealt, remaining } = dealFromDeck(deck, 5);
      deck = remaining;
      return {
        ...player,
        cards: dealt,
        selectedCardIds: [],
        isFolded: false,
        evaluation: null,
        score: player.score - currentRoundBet, // Ante deduction (실질 판돈 차감)
      };
    });

    set({
      deck,
      players: updatedPlayers,
      gamePhase: 'MAKE_COMBINATION',
      winnerId: null,
      roundNumber: get().roundNumber + 1,
      currentRoundBet, // 스토어에 보존
    });
  },

  /**
   * Toggle a card's selection state for the human player.
   * Maximum of 3 cards can be selected at once.
   */
  toggleCardSelection: (playerId: string, cardId: string) => {
    const { players, gamePhase } = get();
    if (gamePhase !== 'MAKE_COMBINATION') return;

    set({
      players: players.map((p) => {
        if (p.id !== playerId) return p;

        const isSelected = p.selectedCardIds.includes(cardId);
        let newSelection: string[];

        if (isSelected) {
          // Deselect
          newSelection = p.selectedCardIds.filter((id) => id !== cardId);
        } else if (p.selectedCardIds.length < 3) {
          // Select (max 3)
          newSelection = [...p.selectedCardIds, cardId];
        } else {
          // Already 3 selected — do nothing
          return p;
        }

        return { ...p, selectedCardIds: newSelection };
      }),
    });
  },

  /**
   * Confirm the 3-card combination for a player.
   * Validates that the 3 selected cards sum to a multiple of 10.
   * After all players have confirmed, triggers evaluation.
   */
  confirmCombination: (playerId: string) => {
    const { players } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    // Validate: exactly 3 cards selected
    if (player.selectedCardIds.length !== 3) return;

    // Get the selected cards
    const selectedCards = player.cards.filter((c) =>
      player.selectedCardIds.includes(c.id)
    );

    // Validate: sum must be a multiple of 10
    const sum = selectedCards.reduce((acc, c) => acc + c.rank, 0);
    if (sum % 10 !== 0) return;

    // Mark player as having confirmed (we'll use evaluation !== null as the flag)
    const remaining2 = player.cards.filter(
      (c) => !player.selectedCardIds.includes(c.id)
    );

    // Evaluate the hand
    const evaluation = evaluateDolryeodaegiHand(player.cards);
    // Override with the player's actual selection (they may have chosen differently)
    evaluation.combination3 = selectedCards;
    evaluation.remaining2 = remaining2;

    // Recalculate jokbo for the player's chosen remaining 2
    const jokbo = calculateJokbo(remaining2[0], remaining2[1]);
    evaluation.jokboType = jokbo.jokboType;
    evaluation.jokboScore = jokbo.jokboScore;
    evaluation.jokboLabel = jokbo.jokboLabel;
    evaluation.isHwang = false;

    const updatedPlayers = players.map((p) =>
      p.id === playerId ? { ...p, evaluation } : p
    );

    // Auto-confirm bots
    const finalPlayers = updatedPlayers.map((p) => {
      if (p.isBot && !p.evaluation) {
        const botCardIds = botSelectCombination(p.cards);
        if (!botCardIds) {
          // Bot is 황
          return {
            ...p,
            evaluation: {
              isHwang: true,
              combination3: [] as Card[],
              remaining2: p.cards.slice(0, 2),
              jokboType: 'MANG' as const,
              jokboScore: -1,
              jokboLabel: '황',
            },
          };
        }
        const botEval = evaluateDolryeodaegiHand(p.cards);
        return { ...p, selectedCardIds: botCardIds, evaluation: botEval };
      }
      return p;
    });

    // Check if all players have confirmed
    const allConfirmed = finalPlayers.every((p) => p.evaluation !== null);

    set({
      players: finalPlayers,
      gamePhase: allConfirmed ? 'SHOWDOWN' : 'MAKE_COMBINATION',
    });
  },

  /**
   * Declare Hwang (황) for a player manually.
   * Checks if their hand is ACTUALLY Hwang to be fair, or just accepts it.
   * We will strictly process it as Hwang.
   */
  declareHwang: (playerId: string) => {
    const { players } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    // We can evaluate their hand to double check, but we'll assign them Hwang
    const updatedPlayers = players.map((p) => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        evaluation: {
          isHwang: true,
          combination3: [] as Card[],
          remaining2: p.cards.slice(0, 2), // arbitrary remaining cards
          jokboType: 'MANG' as const,
          jokboScore: -1,
          jokboLabel: '황',
        },
      };
    });

    // Auto-confirm bots
    const finalPlayers = updatedPlayers.map((p) => {
      if (p.isBot && !p.evaluation) {
        const botCardIds = botSelectCombination(p.cards);
        if (!botCardIds) {
          // Bot is 황
          return {
            ...p,
            evaluation: {
              isHwang: true,
              combination3: [] as Card[],
              remaining2: p.cards.slice(0, 2),
              jokboType: 'MANG' as const,
              jokboScore: -1,
              jokboLabel: '황',
            },
          };
        }
        const botEval = evaluateDolryeodaegiHand(p.cards);
        return { ...p, selectedCardIds: botCardIds, evaluation: botEval };
      }
      return p;
    });

    // Check if all players have confirmed
    const allConfirmed = finalPlayers.every((p) => p.evaluation !== null);

    set({
      players: finalPlayers,
      gamePhase: allConfirmed ? 'SHOWDOWN' : 'MAKE_COMBINATION',
    });
  },

  /**
   * Evaluate all hands and determine the winner.
   * Transitions: SHOWDOWN → RESULT
   */
  evaluateHands: () => {
    const { players, currentRoundBet } = get();

    // Find the player with the best hand
    let bestIdx = 0;
    let isDraw = false;
    for (let i = 1; i < players.length; i++) {
      const evalA = players[bestIdx].evaluation;
      const evalB = players[i].evaluation;
      if (!evalA || !evalB) continue;

      const comp = compareHands(evalB, evalA);
      if (comp > 0) {
        bestIdx = i;
        isDraw = false;
      } else if (comp === 0) {
        isDraw = true;
      }
    }

    const pot = currentRoundBet * players.length;
    let winnerId = isDraw ? 'DRAW' : players[bestIdx].id;

    // Award pot to winner
    const updatedPlayers = players.map((p) => {
      if (isDraw) return { ...p, score: p.score + currentRoundBet }; // Return bets on draw
      return p.id === winnerId ? { ...p, score: p.score + pot } : p;
    });

    set({
      players: updatedPlayers,
      winnerId,
      gamePhase: 'RESULT',
    });
  },

  /**
   * Advance to the next round.
   * Rotates the dealer and deals new cards.
   */
  nextRound: () => {
    const { players, dealerIndex } = get();
    const nextDealer = (dealerIndex + 1) % players.length;

    set({ dealerIndex: nextDealer });
    get().dealCards();
  },

  /**
   * Full game reset back to lobby.
   */
  resetGame: () => {
    set({
      ...INITIAL_STATE,
      players: [],
    });
  },

  /**
   * Change the bet amount.
   */
  setBetAmount: (amount: number) => {
    const state = get();
    const { gamePhase, players, currentRoundBet } = state;

    // "첫 집 짓기 / 황을 하기 전" 상태 판별:
    // MAKE_COMBINATION 단계이고, humanPlayer(나)의 evaluation이 아직 null인 상태
    const humanPlayer = players.find((p) => !p.isBot);
    const isBeforeConfirm =
      gamePhase === 'MAKE_COMBINATION' && humanPlayer && !humanPlayer.evaluation;

    if (isBeforeConfirm) {
      // 실시간으로 차감된 점수를 보정하며 판돈을 즉시 갱신
      const updatedPlayers = players.map((p) => ({
        ...p,
        // 기존에 currentRoundBet만큼 차감되었던 것을 돌려주고, 새로운 amount만큼 차감
        score: p.score + currentRoundBet - amount,
      }));

      set({
        betAmount: amount,
        currentRoundBet: amount,
        players: updatedPlayers,
      });
    } else {
      // 일반적인 변경 (다음 판부터 적용)
      set({ betAmount: amount });
    }
  },

  /**
   * Reset players' score to 1000, set round back to 0, and immediately start a new game round.
   */
  restartGame: () => {
    const { players } = get();
    const resetPlayers = players.map((p) => ({
      ...p,
      score: 1000,
      cards: [],
      selectedCardIds: [],
      isFolded: false,
      evaluation: null,
    }));

    set({
      players: resetPlayers,
      roundNumber: 0,
      winnerId: null,
      gamePhase: 'LOBBY',
    });

    get().dealCards();
  },

  setDifficulty: (difficulty: Difficulty) => set({ difficulty }),

  startTimer: (initialSeconds: number) => {
    set({ timeLeft: initialSeconds, isTimerRunning: true });
  },

  stopTimer: () => set({ timeLeft: null, isTimerRunning: false }),

  tickTimer: () => {
    const { timeLeft, isTimerRunning, handleTimeout } = get();
    if (!isTimerRunning || timeLeft === null) return;

    if (timeLeft <= 1) {
      get().stopTimer();
      handleTimeout();
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  handleTimeout: () => {
    const { gameMode, gamePhase, declareHwang } = get();

    if (gameMode === 'DOLRYEO_DAEGI' && gamePhase === 'MAKE_COMBINATION') {
      console.log("시간 초과! 자동으로 '황' 처리됩니다.");
      declareHwang('player-0');
    }

    if (gameMode === 'GAGU') {
      // dynamic import for gagu store to prevent circular reference
      try {
        const { useGaguStore } = require('./useGaguStore');
        const gaguState = useGaguStore.getState();
        if (gaguState.gamePhase === 'PLAYER_ACTION') {
          console.log("시간 초과! 자동으로 'Stand' 처리됩니다.");
          gaguState.stand();
        }
      } catch (err) {
        console.error('Error handling Gagu timeout:', err);
      }
    }
  },
}));
