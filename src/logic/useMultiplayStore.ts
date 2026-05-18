import { create } from 'zustand';
import { ref, onValue, set as firebaseSet, update, get as firebaseGet, child, push, off } from 'firebase/database';
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
}

export interface RTDBPublicPlayer {
  name: string;
  cardCount: number;
  score: number;
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
  
  // Actions
  login: () => Promise<string>;
  createRoom: (config: RoomConfig, playerName: string) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
  
  // Game Actions
  dealCardsToPlayers: (playersHands: Record<string, string[]>) => Promise<void>;
  playCard: (cardId: string) => Promise<void>;
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

    // Add self to public players if not already there
    const meRef = ref(db, `rooms/${roomId}/publicPlayers/${myId}`);
    const meSnap = await firebaseGet(meRef);
    if (!meSnap.exists()) {
      await firebaseSet(meRef, {
        name: playerName,
        cardCount: 0,
        score: 0,
      });
      // Initialize private hand
      await firebaseSet(ref(db, `rooms/${roomId}/privatePlayers/${myId}/hand`), []);
    }

    set({ roomId, myId });

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

  leaveRoom: () => {
    const { roomId, myId } = get();
    if (!roomId) return;

    const db = getFirebaseDb();
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
      roomConfig: null,
      gameState: null,
      publicPlayers: {},
      privateHand: [],
    });
  },

  dealCardsToPlayers: async (playersHands) => {
    const { roomId, isHost, publicPlayers } = get();
    if (!roomId || !isHost) return;

    const db = getFirebaseDb();
    const updates: Record<string, any> = {};

    // For each player, set their private hand and update public card count
    Object.entries(playersHands).forEach(([userId, hand]) => {
      updates[`rooms/${roomId}/privatePlayers/${userId}/hand`] = hand;
      updates[`rooms/${roomId}/publicPlayers/${userId}/cardCount`] = hand.length;
    });

    // Also update phase to DEAL or PLAYER_ACTION
    updates[`rooms/${roomId}/gameState/phase`] = 'PLAYER_ACTION';

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
  }
}));
