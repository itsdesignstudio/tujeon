import { create } from 'zustand';
import { SutujeonState, SutujeonPlayer, Card } from '@/types/game';
import { createDeck, shuffleDeck, dealFromDeck } from '@/data/deck';
import { evaluateTrickWinner, botSelectCard } from './engine/sutujeon';

const INITIAL_STATE: Omit<SutujeonState, 'initSutujeon' | 'dealCards' | 'playCard' | 'executeBotTurn' | 'evaluateTrick' | 'resetSutujeon'> = {
  deck: [],
  players: [],
  currentTrick: { ledSuit: null, actions: [] },
  gamePhase: 'INIT',
  leadPlayerIndex: 0,
  currentPlayerIndex: 0,
  totalTricksPlayed: 0,
};

function createPlayer(id: string, name: string, isBot: boolean): SutujeonPlayer {
  return { id, name, isBot, cards: [], tricksWon: 0 };
}

export const useSutujeonStore = create<SutujeonState>((set, get) => ({
  ...INITIAL_STATE,

  initSutujeon: () => {
    const players = [
      createPlayer('player-0', '나', false),
      createPlayer('player-1', '서쪽 봇', true),
      createPlayer('player-2', '북쪽 봇', true),
      createPlayer('player-3', '동쪽 봇', true),
    ];
    set({
      ...INITIAL_STATE,
      players,
      gamePhase: 'INIT',
    });
  },

  dealCards: () => {
    const { players } = get();
    // Sutujeon uses the full 80-card deck
    let deck = shuffleDeck(createDeck(80));

    const updatedPlayers = players.map(p => {
      const { dealt, remaining } = dealFromDeck(deck, 20);
      deck = remaining;
      return { ...p, cards: dealt, tricksWon: 0 };
    });

    set({
      deck,
      players: updatedPlayers,
      gamePhase: 'PLAY',
      leadPlayerIndex: 0,
      currentPlayerIndex: 0,
      totalTricksPlayed: 0,
      currentTrick: { ledSuit: null, actions: [] },
    });

    // If first player is bot, trigger turn
    if (updatedPlayers[0].isBot) {
      setTimeout(() => get().executeBotTurn(), 800);
    }
  },

  playCard: (playerId: string, cardId: string) => {
    const { players, currentTrick, gamePhase, currentPlayerIndex } = get();
    if (gamePhase !== 'PLAY') return;

    const player = players[currentPlayerIndex];
    if (player.id !== playerId) return;

    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    
    const playedCard = player.cards[cardIndex];

    // Validate led suit for human
    if (!player.isBot && currentTrick.ledSuit) {
      const hasLedSuit = player.cards.some(c => c.suit === currentTrick.ledSuit);
      if (hasLedSuit && playedCard.suit !== currentTrick.ledSuit) {
        // Invalid play, must follow suit
        return;
      }
    }

    // Remove card from hand
    const updatedCards = [...player.cards];
    updatedCards.splice(cardIndex, 1);

    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = { ...player, cards: updatedCards };

    const newActions = [...currentTrick.actions, { playerId, card: playedCard }];
    const newLedSuit = currentTrick.ledSuit || playedCard.suit;

    set({
      players: updatedPlayers,
      currentTrick: {
        ledSuit: newLedSuit,
        actions: newActions,
      },
      currentPlayerIndex: (currentPlayerIndex + 1) % 4,
    });

    // Check if trick is over
    if (newActions.length === 4) {
      setTimeout(() => {
        set({ gamePhase: 'TRICK_EVAL' });
        setTimeout(() => get().evaluateTrick(), 1500);
      }, 1000);
    } else {
      // Trigger next bot if applicable
      const nextPlayer = get().players[get().currentPlayerIndex];
      if (nextPlayer.isBot) {
        setTimeout(() => get().executeBotTurn(), 600);
      }
    }
  },

  executeBotTurn: () => {
    const { players, currentPlayerIndex, currentTrick, gamePhase } = get();
    if (gamePhase !== 'PLAY') return;

    const bot = players[currentPlayerIndex];
    if (!bot.isBot) return;

    const cardToPlay = botSelectCard(bot.cards, currentTrick.ledSuit);
    get().playCard(bot.id, cardToPlay.id);
  },

  evaluateTrick: () => {
    const { currentTrick, players, leadPlayerIndex, totalTricksPlayed } = get();
    
    try {
      const winnerId = evaluateTrickWinner(currentTrick);
      const winnerIndex = players.findIndex(p => p.id === winnerId);

      const updatedPlayers = players.map(p => 
        p.id === winnerId ? { ...p, tricksWon: p.tricksWon + 1 } : p
      );

      const newTotalTricks = totalTricksPlayed + 1;

      if (newTotalTricks >= 20) {
        set({
          players: updatedPlayers,
          gamePhase: 'RESULT',
          currentTrick: { ledSuit: null, actions: [] },
        });
      } else {
        set({
          players: updatedPlayers,
          currentTrick: { ledSuit: null, actions: [] },
          gamePhase: 'PLAY',
          leadPlayerIndex: winnerIndex,
          currentPlayerIndex: winnerIndex,
          totalTricksPlayed: newTotalTricks,
        });

        const nextLead = updatedPlayers[winnerIndex];
        if (nextLead.isBot) {
          setTimeout(() => get().executeBotTurn(), 800);
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  resetSutujeon: () => {
    set({ ...INITIAL_STATE });
  },
}));
