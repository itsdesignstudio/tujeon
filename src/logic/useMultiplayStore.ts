import { create } from 'zustand';
import { ref, onValue, set as firebaseSet, remove as firebaseRemove, update, get as firebaseGet, child, push, off, onDisconnect } from 'firebase/database';
import { getFirebaseDb, loginAnonymously } from '@/lib/firebase';
import { Card, GameMode } from '@/types/game';

// ============================================================
// Multiplay State Types (Reflecting RTDB Schema)
// ============================================================

export interface RoomConfig {
  gameMode: GameMode;
  maxPlayers: number;
}

export interface RTDBGameState {
  phase: string;
  currentTurn: string | null;
  ledSuit?: string | null; // For Sutujeon
  tableCards?: Record<string, string>; // { [userId]: cardId }
  deck?: string[]; // For Gagu
  gaguStatus?: Record<string, { hasStood: boolean; score: number }>; // For Gagu
  winnerId?: string | null; // For Gagu & Sutujeon
  showdownHands?: Record<string, string[]>; // For Gagu
  sutujeonTrickActions?: { playerId: string; cardId: string }[]; // For Sutujeon
  sutujeonTotalTricks?: number; // For Sutujeon
}

export interface RTDBPublicPlayer {
  name: string;
  cardCount: number;
  score: number;
  isOnline?: boolean;
}

export interface RoomState {
  config: RoomConfig;
  gameState: RTDBGameState;
  publicPlayers: Record<string, RTDBPublicPlayer>;
}

export interface MultiplayState {
  myId: string | null;
  roomId: string | null;
  isHost: boolean;
  
  // Synced from RTDB
  roomConfig: RoomConfig | null;
  gameState: RTDBGameState | null;
  publicPlayers: Record<string, RTDBPublicPlayer>;
  privateHand: Card[] | string[]; // Can be Card objects or card IDs depending on implementation
  
  // Connection
  isMatchmaking: boolean;
  _connectedUnsubscribe?: (() => void) | null;

  // Actions
  login: () => Promise<string>;
  createRoom: (config: RoomConfig, playerName: string) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  findMatch: (gameMode: GameMode, playerName: string) => Promise<string>;
  leaveRoom: () => void;
  
  // Game Actions
  dealCardsToPlayers: (params: { playersHands: Record<string, string[]>; deck: string[]; gaguStatus?: Record<string, { hasStood: boolean; score: number }> }) => Promise<void>;
  playCard: (cardId: string) => Promise<void>;
  hitGagu: () => Promise<void>;
  standGagu: () => Promise<void>;
  evaluateGaguShowdown: () => Promise<void>;
  playCardSutujeon: (cardId: string) => Promise<void>;
  evaluateSutujeonTrick: () => Promise<void>;
  endTurn: (nextUserId: string) => Promise<void>;
  updateGameState: (newState: Partial<RTDBGameState>) => Promise<void>;
}

// ============================================================
// Store Implementation
// ============================================================

export const useMultiplayStore = create<MultiplayState>((set, get) => ({
  myId: null,
  roomId: null,
  isHost: false,
  isMatchmaking: false,
  
  roomConfig: null,
  gameState: null,
  publicPlayers: {},
  privateHand: [],

  login: async () => {
    const user = await loginAnonymously();
    set({ myId: user.uid });
    return user.uid;
  },

  createRoom: async (config, playerName) => {
    let { myId } = get();
    if (!myId) {
      myId = await get().login();
    }

    const db = getFirebaseDb();
    
    // Generate a 6-character short code
    const generateShortCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const newRoomId = generateShortCode();
    const roomRef = ref(db, `rooms/${newRoomId}`);

    const initialRoomData = {
      config,
      gameState: {
        phase: 'LOBBY',
        currentTurn: myId, // Host starts initially
        tableCards: {},
      },
      publicPlayers: {
        [myId]: {
          name: playerName,
          cardCount: 0,
          score: 0,
        }
      },
      privatePlayers: {
        [myId]: {
          hand: []
        }
      }
    };

    await firebaseSet(roomRef, initialRoomData);
    
    // Register this room in the matchmaking queue so others can find it
    await firebaseSet(ref(db, `matchmaking/${config.gameMode}/${newRoomId}`), {
      hostName: playerName,
      currentPlayers: 1,
      maxPlayers: config.maxPlayers,
      createdAt: Date.now(),
    });
    
    set({ isHost: true });
    await get().joinRoom(newRoomId, playerName);
    
    return newRoomId;
  },

  joinRoom: async (roomId, playerName) => {
    let { myId } = get();
    if (!myId) {
      myId = await get().login();
    }

    const db = getFirebaseDb();
    const roomRef = ref(db, `rooms/${roomId}`);
    
    // Check if room exists
    const snapshot = await firebaseGet(child(ref(db), `rooms/${roomId}/config`));
    if (!snapshot.exists()) {
      throw new Error('Room does not exist');
    }

    const config: RoomConfig = snapshot.val();
    const meRef = ref(db, `rooms/${roomId}/publicPlayers/${myId}`);

    // ── Handle Presence and Reconnections ──
    const connectedRef = ref(db, '.info/connected');
    const phaseRef = ref(db, `rooms/${roomId}/gameState/phase`);
    let currentPhase = 'LOBBY';
    let isSocketConnected = false;

    // Track phase locally to adjust onDisconnect dynamically
    const phaseUnsubscribe = onValue(phaseRef, (snap) => {
      currentPhase = snap.val() || 'LOBBY';
      if (isSocketConnected) {
        onDisconnect(meRef).cancel();
        if (currentPhase === 'LOBBY') {
          onDisconnect(meRef).remove();
        } else {
          onDisconnect(child(meRef, 'isOnline')).set(false);
        }
      }
    });

    const connectedUnsubscribe = onValue(connectedRef, async (snap) => {
      isSocketConnected = snap.val() === true;
      if (isSocketConnected) {
        // Check if room config still exists (it might have been deleted)
        const roomConfigSnap = await firebaseGet(child(ref(db), `rooms/${roomId}/config`));
        if (!roomConfigSnap.exists()) {
          get().leaveRoom();
          return;
        }

        // Add self to public players if missing, or update isOnline
        const meSnap = await firebaseGet(meRef);
        if (!meSnap.exists()) {
          await firebaseSet(meRef, {
            name: playerName,
            cardCount: 0,
            score: 0,
            isOnline: true,
          });

          // Initialize private hand if missing
          const myHandRef = ref(db, `rooms/${roomId}/privatePlayers/${myId}/hand`);
          const handSnap = await firebaseGet(myHandRef);
          if (!handSnap.exists()) {
            await firebaseSet(myHandRef, []);
          }

          // Update matchmaking queue with new player count
          const playersSnap = await firebaseGet(ref(db, `rooms/${roomId}/publicPlayers`));
          const currentPlayers = playersSnap.exists() ? Object.keys(playersSnap.val()).length : 1;
          const mmRef = ref(db, `matchmaking/${config.gameMode}/${roomId}`);
          
          if (currentPlayers >= config.maxPlayers) {
            await firebaseRemove(mmRef);
          } else {
            // Only update queue if we are still in LOBBY phase
            if (currentPhase === 'LOBBY') {
              await update(mmRef, { currentPlayers });
            }
          }
        } else {
          // If already exists, mark as online
          await firebaseSet(child(meRef, 'isOnline'), true);
        }

        // Establish onDisconnect hook dynamically based on phase
        onDisconnect(meRef).cancel();
        if (currentPhase === 'LOBBY') {
          onDisconnect(meRef).remove();
        } else {
          onDisconnect(child(meRef, 'isOnline')).set(false);
        }
      }
    });

    const combinedUnsubscribe = () => {
      phaseUnsubscribe();
      connectedUnsubscribe();
    };

    set({ roomId, myId, isMatchmaking: false, _connectedUnsubscribe: combinedUnsubscribe });

    // Setup Listeners
    const configRef = ref(db, `rooms/${roomId}/config`);
    onValue(configRef, (snap) => set({ roomConfig: snap.val() }));

    const gameStateRef = ref(db, `rooms/${roomId}/gameState`);
    onValue(gameStateRef, (snap) => set({ gameState: snap.val() }));

    const publicPlayersRef = ref(db, `rooms/${roomId}/publicPlayers`);
    onValue(publicPlayersRef, (snap) => set({ publicPlayers: snap.val() || {} }));

    const myHandRef = ref(db, `rooms/${roomId}/privatePlayers/${myId}/hand`);
    onValue(myHandRef, (snap) => set({ privateHand: snap.val() || [] }));
  },

  findMatch: async (gameMode, playerName) => {
    let { myId } = get();
    if (!myId) {
      myId = await get().login();
    }

    set({ isMatchmaking: true });

    const db = getFirebaseDb();
    const mmRef = ref(db, `matchmaking/${gameMode}`);
    const snapshot = await firebaseGet(mmRef);

    if (snapshot.exists()) {
      const rooms = snapshot.val() as Record<string, {
        hostName: string;
        currentPlayers: number;
        maxPlayers: number;
        createdAt: number;
      }>;

      // Find rooms that aren't full, sorted oldest first (FIFO)
      const availableRooms = Object.entries(rooms)
        .filter(([_, info]) => info.currentPlayers < info.maxPlayers)
        .sort(([, a], [, b]) => a.createdAt - b.createdAt);

      if (availableRooms.length > 0) {
        // Join the oldest available room
        const [foundRoomId] = availableRooms[0];
        try {
          await get().joinRoom(foundRoomId, playerName);
          return foundRoomId;
        } catch {
          // Room may have been deleted/filled between query and join — fall through to create
        }
      }
    }

    // No available rooms found — create a new one
    const config: RoomConfig = {
      gameMode,
      maxPlayers: gameMode === 'SUTUJEON' ? 4 : 2,
    };
    const newRoomId = await get().createRoom(config, playerName);
    return newRoomId;
  },

  leaveRoom: () => {
    const { roomId, myId, isHost, roomConfig, _connectedUnsubscribe } = get();
    if (!roomId) return;

    if (_connectedUnsubscribe) {
      _connectedUnsubscribe();
    }

    const db = getFirebaseDb();
    
    // Explicitly remove myself from the room
    if (myId) {
      firebaseRemove(ref(db, `rooms/${roomId}/publicPlayers/${myId}`));
      firebaseRemove(ref(db, `rooms/${roomId}/privatePlayers/${myId}`));
      // Also cancel the onDisconnect since we are leaving cleanly
      onDisconnect(ref(db, `rooms/${roomId}/publicPlayers/${myId}`)).cancel();
    }

    // If host leaves, remove the room from matchmaking queue entirely
    if (isHost && roomConfig) {
      firebaseRemove(ref(db, `matchmaking/${roomConfig.gameMode}/${roomId}`));
    }

    // Remove listeners
    off(ref(db, `rooms/${roomId}/config`));
    off(ref(db, `rooms/${roomId}/gameState`));
    off(ref(db, `rooms/${roomId}/publicPlayers`));
    if (myId) {
      off(ref(db, `rooms/${roomId}/privatePlayers/${myId}/hand`));
    }

    set({
      roomId: null,
      isHost: false,
      isMatchmaking: false,
      roomConfig: null,
      gameState: null,
      publicPlayers: {},
      privateHand: [],
      _connectedUnsubscribe: null,
    });
  },

  dealCardsToPlayers: async ({ playersHands, deck, gaguStatus }) => {
    const { roomId, isHost, publicPlayers, roomConfig } = get();
    if (!roomId || !isHost) return;

    const db = getFirebaseDb();

    // Game is starting — remove from matchmaking queue
    if (roomConfig) {
      await firebaseRemove(ref(db, `matchmaking/${roomConfig.gameMode}/${roomId}`));
    }

    const updates: Record<string, any> = {};

    // For each player, set their private hand and update public card count
    Object.entries(playersHands).forEach(([userId, hand]) => {
      updates[`rooms/${roomId}/privatePlayers/${userId}/hand`] = hand;
      updates[`rooms/${roomId}/publicPlayers/${userId}/cardCount`] = hand.length;
    });

    // Also update phase to DEAL or PLAYER_ACTION
    updates[`rooms/${roomId}/gameState/phase`] = 'PLAYER_ACTION';
    
    if (deck) {
      updates[`rooms/${roomId}/gameState/deck`] = deck;
    }
    if (gaguStatus) {
      updates[`rooms/${roomId}/gameState/gaguStatus`] = gaguStatus;
    }
    
    // If it's Sutujeon, init trick data
    if (roomConfig?.gameMode === 'SUTUJEON') {
      updates[`rooms/${roomId}/gameState/sutujeonTotalTricks`] = 0;
      updates[`rooms/${roomId}/gameState/sutujeonTrickActions`] = [];
      updates[`rooms/${roomId}/gameState/ledSuit`] = null;
    }

    await update(ref(db), updates);
  },

  playCard: async (cardId) => {
    const { roomId, myId, privateHand, gameState, publicPlayers } = get();
    if (!roomId || !myId || !gameState) return;

    if (gameState.currentTurn !== myId) {
      console.warn("Not your turn!");
      return;
    }

    const db = getFirebaseDb();
    const newHand = (privateHand as string[]).filter((c) => c !== cardId);
    
    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/privatePlayers/${myId}/hand`] = newHand;
    updates[`rooms/${roomId}/publicPlayers/${myId}/cardCount`] = newHand.length;
    
    // Add to table cards
    updates[`rooms/${roomId}/gameState/tableCards/${myId}`] = cardId;

    await update(ref(db), updates);
  },

  endTurn: async (nextUserId) => {
    const { roomId, myId, gameState } = get();
    if (!roomId || !myId || !gameState) return;

    if (gameState.currentTurn !== myId) return;

    const db = getFirebaseDb();
    await update(ref(db, `rooms/${roomId}/gameState`), {
      currentTurn: nextUserId
    });
  },

  updateGameState: async (newState) => {
    const { roomId } = get();
    if (!roomId) return;

    const db = getFirebaseDb();
    await update(ref(db, `rooms/${roomId}/gameState`), newState);
  },

  hitGagu: async () => {
    const { roomId, myId, privateHand, gameState, publicPlayers } = get();
    if (!roomId || !myId || !gameState || !gameState.deck) return;
    if (gameState.currentTurn !== myId) return;

    const db = getFirebaseDb();
    
    const deck = [...gameState.deck];
    if (deck.length === 0) return;
    const drawnCard = deck.shift()!;

    const newHand = [...(privateHand as string[]), drawnCard];
    
    const scoreSum = newHand.reduce((acc, c) => acc + parseInt(c.split('_')[1], 10), 0);
    const newScore = scoreSum % 10;
    
    const hasStood = newHand.length >= 3;

    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/privatePlayers/${myId}/hand`] = newHand;
    updates[`rooms/${roomId}/publicPlayers/${myId}/cardCount`] = newHand.length;
    updates[`rooms/${roomId}/gameState/deck`] = deck;
    updates[`rooms/${roomId}/gameState/gaguStatus/${myId}/score`] = newScore;
    updates[`rooms/${roomId}/gameState/gaguStatus/${myId}/hasStood`] = hasStood;

    // Check if turn should pass
    let nextPhase = gameState.phase;
    let nextTurn = gameState.currentTurn;

    if (hasStood) {
      // Find next player who hasn't stood
      const players = Object.keys(publicPlayers);
      const myIdx = players.indexOf(myId);
      
      let foundNext = false;
      for (let i = 1; i < players.length; i++) {
        const nextId = players[(myIdx + i) % players.length];
        const pStatus = gameState.gaguStatus?.[nextId];
        if (!pStatus?.hasStood) {
          nextTurn = nextId;
          foundNext = true;
          break;
        }
      }
      
      if (!foundNext) {
        nextPhase = 'SHOWDOWN';
      }
    }

    if (nextPhase !== gameState.phase) updates[`rooms/${roomId}/gameState/phase`] = nextPhase;
    if (nextTurn !== gameState.currentTurn) updates[`rooms/${roomId}/gameState/currentTurn`] = nextTurn;

    await update(ref(db), updates);
  },

  standGagu: async () => {
    const { roomId, myId, gameState, publicPlayers } = get();
    if (!roomId || !myId || !gameState) return;
    if (gameState.currentTurn !== myId) return;

    const db = getFirebaseDb();
    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/gameState/gaguStatus/${myId}/hasStood`] = true;

    // Find next player who hasn't stood
    const players = Object.keys(publicPlayers);
    const myIdx = players.indexOf(myId);
    
    let nextPhase = gameState.phase;
    let nextTurn = gameState.currentTurn;
    let foundNext = false;
    for (let i = 1; i < players.length; i++) {
      const nextId = players[(myIdx + i) % players.length];
      const pStatus = gameState.gaguStatus?.[nextId];
      if (!pStatus?.hasStood) {
        nextTurn = nextId;
        foundNext = true;
        break;
      }
    }
    
    if (!foundNext) {
      nextPhase = 'SHOWDOWN';
    }

    if (nextPhase !== gameState.phase) updates[`rooms/${roomId}/gameState/phase`] = nextPhase;
    if (nextTurn !== gameState.currentTurn) updates[`rooms/${roomId}/gameState/currentTurn`] = nextTurn;

    await update(ref(db), updates);
  },

  evaluateGaguShowdown: async () => {
    const { roomId, isHost, gameState } = get();
    if (!roomId || !isHost || !gameState || !gameState.gaguStatus) return;

    const db = getFirebaseDb();
    const uids = Object.keys(gameState.gaguStatus);
    if (uids.length < 2) return;

    // Simple 2-player eval for now
    const p1 = uids[0];
    const p2 = uids[1];
    const s1 = gameState.gaguStatus[p1].score;
    const s2 = gameState.gaguStatus[p2].score;

    let winnerId = 'DRAW';
    if (s1 > s2) winnerId = p1;
    else if (s2 > s1) winnerId = p2;

    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/gameState/winnerId`] = winnerId;
    updates[`rooms/${roomId}/gameState/phase`] = 'RESULT';
    
    // Fetch private hands to show them to everyone
    const privatePlayersSnap = await firebaseGet(child(ref(db), `rooms/${roomId}/privatePlayers`));
    if (privatePlayersSnap.exists()) {
      const privatePlayers = privatePlayersSnap.val();
      const showdownHands: Record<string, string[]> = {};
      Object.keys(privatePlayers).forEach(uid => {
        showdownHands[uid] = privatePlayers[uid].hand || [];
      });
      updates[`rooms/${roomId}/gameState/showdownHands`] = showdownHands;
    }

    await update(ref(db), updates);
  },

  playCardSutujeon: async (cardId) => {
    const { roomId, myId, privateHand, gameState, publicPlayers } = get();
    if (!roomId || !myId || !gameState || gameState.phase !== 'PLAYER_ACTION') return;
    if (gameState.currentTurn !== myId) return;

    const db = getFirebaseDb();
    
    const newHand = (privateHand as string[]).filter(c => c !== cardId);
    
    // Parse card suit for ledSuit
    const parts = cardId.split('_');
    const suit = parts[0];

    const currentActions = gameState.sutujeonTrickActions || [];
    const newActions = [...currentActions, { playerId: myId, cardId }];
    
    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/privatePlayers/${myId}/hand`] = newHand;
    updates[`rooms/${roomId}/publicPlayers/${myId}/cardCount`] = newHand.length;
    updates[`rooms/${roomId}/gameState/sutujeonTrickActions`] = newActions;

    if (currentActions.length === 0) {
      // First card in trick sets the ledSuit
      updates[`rooms/${roomId}/gameState/ledSuit`] = suit;
    }

    if (newActions.length === 4) {
      // Trick is over, go to eval phase
      updates[`rooms/${roomId}/gameState/phase`] = 'TRICK_EVAL';
      updates[`rooms/${roomId}/gameState/currentTurn`] = null;
    } else {
      // Pass turn to next player
      const players = Object.keys(publicPlayers).sort();
      const myIdx = players.indexOf(myId);
      const nextTurn = players[(myIdx + 1) % 4];
      updates[`rooms/${roomId}/gameState/currentTurn`] = nextTurn;
    }

    await update(ref(db), updates);
  },

  evaluateSutujeonTrick: async () => {
    const { roomId, isHost, gameState, publicPlayers } = get();
    if (!roomId || !isHost || !gameState || gameState.phase !== 'TRICK_EVAL') return;
    
    const actions = gameState.sutujeonTrickActions || [];
    if (actions.length !== 4) return;

    const db = getFirebaseDb();
    
    // Import dynamically or calculate here to avoid circular dep
    const getCardPower = (rank: number, suit: string) => {
      if (rank === 10) return 11;
      const highWinsSuits = ['PERSON', 'FISH', 'BIRD', 'PHEASANT'];
      if (highWinsSuits.includes(suit)) return rank + 1;
      return (10 - rank) + 1;
    };

    const ledSuit = gameState.ledSuit;
    let highestPower = -1;
    let winnerId = '';

    for (const action of actions) {
      const [suit, rankStr] = action.cardId.split('_');
      const rank = parseInt(rankStr, 10);
      
      if (suit === ledSuit) {
        const power = getCardPower(rank, suit);
        if (power > highestPower) {
          highestPower = power;
          winnerId = action.playerId;
        }
      }
    }

    const updates: Record<string, any> = {};
    
    // Increment winner score (tricks won)
    const currentScore = publicPlayers[winnerId]?.score || 0;
    updates[`rooms/${roomId}/publicPlayers/${winnerId}/score`] = currentScore + 1;

    const totalTricks = (gameState.sutujeonTotalTricks || 0) + 1;
    updates[`rooms/${roomId}/gameState/sutujeonTotalTricks`] = totalTricks;

    if (totalTricks >= 20) {
      // Game over, find overall winner
      // publicPlayers is currently stale here for the winner, so calculate manually
      let maxScore = -1;
      let overallWinner = '';
      
      Object.keys(publicPlayers).forEach(uid => {
        const score = uid === winnerId ? currentScore + 1 : publicPlayers[uid].score;
        if (score > maxScore) {
          maxScore = score;
          overallWinner = uid;
        }
      });
      
      updates[`rooms/${roomId}/gameState/phase`] = 'RESULT';
      updates[`rooms/${roomId}/gameState/winnerId`] = overallWinner;
    } else {
      // Next trick
      updates[`rooms/${roomId}/gameState/phase`] = 'PLAYER_ACTION';
      updates[`rooms/${roomId}/gameState/currentTurn`] = winnerId;
      updates[`rooms/${roomId}/gameState/ledSuit`] = null;
      updates[`rooms/${roomId}/gameState/sutujeonTrickActions`] = [];
    }

    await update(ref(db), updates);
  }
}));
