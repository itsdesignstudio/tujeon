// ============================================================
// Tujeon (투전) — Zustand Game State Store
// ============================================================

import { create } from 'zustand';
import { GameState, GameMode, Player, Card, GamePhase } from '@/types/game';
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
  'evaluateHands' | 'nextRound' | 'resetGame'
> = {
  gameMode: 'DOLRYEO_DAEGI',
  deck: [],
  players: [],
  dealerIndex: 0,
  currentPlayerIndex: 0,
  gamePhase: 'LOBBY',
  winnerId: null,
  roundNumber: 0,
  betAmount: 50,
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

    const updatedPlayers = players.map((player) => {
      const { dealt, remaining } = dealFromDeck(deck, 5);
      deck = remaining;
      return {
        ...player,
        cards: dealt,
        selectedCardIds: [],
        isFolded: false,
        evaluation: null,
        score: player.score - betAmount, // Ante deduction
      };
    });

    set({
      deck,
      players: updatedPlayers,
      gamePhase: 'MAKE_COMBINATION',
      winnerId: null,
      roundNumber: get().roundNumber + 1,
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
    const { players, betAmount } = get();

    // Find the player with the best hand
    let bestIdx = 0;
    for (let i = 1; i < players.length; i++) {
      const evalA = players[bestIdx].evaluation;
      const evalB = players[i].evaluation;
      if (!evalA || !evalB) continue;

      if (compareHands(evalB, evalA) > 0) {
        bestIdx = i;
      }
    }

    const pot = betAmount * players.length;
    const winnerId = players[bestIdx].id;

    // Award pot to winner
    const updatedPlayers = players.map((p) =>
      p.id === winnerId ? { ...p, score: p.score + pot } : p
    );

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
}));
