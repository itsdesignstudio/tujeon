import { create } from 'zustand';
import { ref, onValue, set as firebaseSet, remove as firebaseRemove, update, get as firebaseGet, child, push, off, onDisconnect } from 'firebase/database';
import { getFirebaseDb, loginAnonymously } from '@/lib/firebase';
import { Card, GameMode, SUIT_INFO } from '@/types/game';
import { evaluateDolryeodaegiHand, compareHands, calculateJokbo } from './engine/dolryeodaegi';

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
  // ── For Gagupan ──
  gagupanSpots?: Record<string, { cards: string[]; score: number }>;
  gagupanBanker?: { cards: string[]; score: number };
  gagupanBets?: Record<string, Record<string, number>>; // { [spotId]: { [playerId]: betAmount } }
  gagupanWinnerResults?: Record<string, 'WIN' | 'LOSE' | 'DRAW'>;
  gagupanConfirmedPlayers?: Record<string, boolean>;
}

export interface RTDBPublicPlayer {
  name: string;
  cardCount: number;
  score: number;
  isOnline?: boolean;
  isBot?: boolean;
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
  evaluateDolryeodaegiShowdown: () => Promise<void>;
  endTurn: (nextUserId: string) => Promise<void>;
  updateGameState: (newState: Partial<RTDBGameState>) => Promise<void>;
  startNextRound: () => Promise<void>;

  // Gagupan Actions
  placeBetGagupan: (spotId: string, amount: number) => Promise<void>;
  clearBetsGagupan: () => Promise<void>;
  confirmBetsGagupan: () => Promise<void>;
  dealGagupan: () => Promise<void>;
  processDrawsGagupan: () => Promise<void>;
  evaluateGagupanShowdown: () => Promise<void>;
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
    updates[`rooms/${roomId}/gameState/phase`] = roomConfig?.gameMode === 'DOLRYEO_DAEGI' ? 'MAKE_COMBINATION' : 'PLAYER_ACTION';
    
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

  startNextRound: async () => {
    const { isHost, publicPlayers, roomConfig, dealCardsToPlayers, roomId } = get();
    if (!isHost || !roomConfig) return;

    if (roomConfig.gameMode === 'GAGUPAN') {
      const db = getFirebaseDb();
      const updates: Record<string, any> = {};
      updates[`rooms/${roomId}/gameState/phase`] = 'BETTING';
      updates[`rooms/${roomId}/gameState/deck`] = null;
      updates[`rooms/${roomId}/gameState/gagupanSpots`] = null;
      updates[`rooms/${roomId}/gameState/gagupanBanker`] = null;
      updates[`rooms/${roomId}/gameState/gagupanBets`] = null;
      updates[`rooms/${roomId}/gameState/gagupanWinnerResults`] = null;
      updates[`rooms/${roomId}/gameState/gagupanConfirmedPlayers`] = null;
      
      // Reset cardCount to 0 for all players
      Object.keys(publicPlayers).forEach((uid) => {
        updates[`rooms/${roomId}/publicPlayers/${uid}/cardCount`] = 0;
      });

      await update(ref(db), updates);
      return;
    }

    // Determine the number of cards per player
    let numCards = 2; // Default for GAGU
    if (roomConfig.gameMode === 'SUTUJEON') numCards = 20;
    else if (roomConfig.gameMode === 'DOLRYEO_DAEGI') numCards = 5;

    // Create and shuffle deck
    const { createDeck, shuffleDeck, dealFromDeck } = await import('@/data/deck');
    let deck = shuffleDeck(createDeck(roomConfig.gameMode === 'SUTUJEON' ? 80 : 40));
    const playersHands: Record<string, string[]> = {};
    const gaguStatus: Record<string, { hasStood: boolean; score: number }> = {};
    
    // Cleanup old states like 'confirmed_' or 'sutujeonTrickActions'
    // They get overridden or cleaned by dealCardsToPlayers mostly, 
    // but for 'confirmed_' in Dolryeodaegi we should explicitly clear them via updateGameState
    const clearConfirmed: Record<string, any> = {};

    Object.keys(publicPlayers).forEach((uid) => {
      const { dealt, remaining } = dealFromDeck(deck, numCards);
      deck = remaining;
      playersHands[uid] = dealt.map(c => c.id);
      
      const scoreSum = dealt.reduce((acc, c) => acc + c.rank, 0);
      gaguStatus[uid] = { hasStood: false, score: scoreSum % 10 };
      
      if (roomConfig.gameMode === 'DOLRYEO_DAEGI') {
        clearConfirmed[`confirmed_${uid}`] = null;
      }
    });

    if (roomConfig.gameMode === 'DOLRYEO_DAEGI') {
      await get().updateGameState(clearConfirmed);
    }

    await dealCardsToPlayers({
      playersHands,
      deck: deck.map(c => c.id),
      gaguStatus
    });
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

  evaluateDolryeodaegiShowdown: async () => {
    const { roomId, isHost, gameState, publicPlayers } = get();
    if (!roomId || !isHost || !gameState) return;

    const db = getFirebaseDb();
    
    // Fetch private hands
    const privatePlayersSnap = await firebaseGet(child(ref(db), `rooms/${roomId}/privatePlayers`));
    if (!privatePlayersSnap.exists()) return;
    const privatePlayers = privatePlayersSnap.val();

    const uids = Object.keys(publicPlayers);
    const showdownHands: Record<string, string[]> = {};
    const evaluations: Record<string, any> = {};

    uids.forEach(uid => {
      showdownHands[uid] = privatePlayers[uid]?.hand || [];
      const cards = showdownHands[uid].map(cardId => {
        const parts = cardId.split('_');
        return { id: cardId, suit: parts[0] as any, rank: parseInt(parts[1], 10), imageUrl: '' };
      });

      const confirmedVal = (gameState as any)?.[`confirmed_${uid}`] as string | undefined;
      let evaluation: any;

      if (!confirmedVal || confirmedVal === 'HWANG') {
        // 황 선언 또는 제출 없음
        evaluation = {
          isHwang: true,
          combination3: [],
          remaining2: cards.slice(0, 2),
          jokboType: 'MANG',
          jokboScore: -1,
          jokboLabel: '황',
        };
      } else {
        const confirmedIds = confirmedVal.split(',');
        const combo3 = cards.filter(c => confirmedIds.includes(c.id));
        const sum3 = combo3.reduce((acc, c) => acc + c.rank, 0);

        if (combo3.length === 3 && sum3 % 10 === 0) {
          const remaining2 = cards.filter(c => !confirmedIds.includes(c.id));
          if (remaining2.length === 2) {
            const jokbo = calculateJokbo(remaining2[0], remaining2[1]);
            evaluation = {
              isHwang: false,
              combination3: combo3,
              remaining2,
              jokboType: jokbo.jokboType,
              jokboScore: jokbo.jokboScore,
              jokboLabel: jokbo.jokboLabel,
            };
          } else {
            evaluation = evaluateDolryeodaegiHand(cards);
          }
        } else {
          // 잘못된 집 짓기 (합이 10의 배수가 아님) -> 황 처리
          evaluation = {
            isHwang: true,
            combination3: [],
            remaining2: cards.slice(0, 2),
            jokboType: 'MANG',
            jokboScore: -1,
            jokboLabel: '황',
          };
        }
      }

      evaluations[uid] = evaluation;
    });

    let bestIdx = 0;
    let isDraw = false;
    for (let i = 1; i < uids.length; i++) {
      const evalA = evaluations[uids[bestIdx]];
      const evalB = evaluations[uids[i]];
      const comp = compareHands(evalB, evalA);
      if (comp > 0) {
        bestIdx = i;
        isDraw = false;
      } else if (comp === 0) {
        isDraw = true;
      }
    }

    let winnerId = isDraw ? 'DRAW' : uids[bestIdx];

    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/gameState/winnerId`] = winnerId;
    updates[`rooms/${roomId}/gameState/phase`] = 'RESULT';
    updates[`rooms/${roomId}/gameState/showdownHands`] = showdownHands;

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
      // Trick is over, block additional turns immediately
      updates[`rooms/${roomId}/gameState/currentTurn`] = null;
      await update(ref(db), updates);

      // Transition phase to TRICK_EVAL after 1000ms to allow card animation to settle
      setTimeout(async () => {
        const evalUpdates: Record<string, any> = {};
        evalUpdates[`rooms/${roomId}/gameState/phase`] = 'TRICK_EVAL';
        await update(ref(db), evalUpdates);
      }, 1000);
    } else {
      // Pass turn to next player
      const players = Object.keys(publicPlayers).sort();
      const myIdx = players.indexOf(myId);
      const nextTurn = players[(myIdx + 1) % 4];
      updates[`rooms/${roomId}/gameState/currentTurn`] = nextTurn;
      await update(ref(db), updates);
    }
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
  },

  // ── Gagupan Multiplay Actions ──

  placeBetGagupan: async (spotId, amount) => {
    const { roomId, myId, publicPlayers, gameState } = get();
    if (!roomId || !myId || !gameState || gameState.phase !== 'BETTING') return;

    const db = getFirebaseDb();
    const currentScore = publicPlayers[myId]?.score || 0;
    if (currentScore < amount) return; // 자금 부족

    // 플레이어 점수 차감
    const newScore = currentScore - amount;

    // 해당 Spot의 내 배팅 조회 후 갱신
    const currentSpotBet = gameState.gagupanBets?.[spotId]?.[myId] || 0;
    const newSpotBet = currentSpotBet + amount;

    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/publicPlayers/${myId}/score`] = newScore;
    updates[`rooms/${roomId}/gameState/gagupanBets/${spotId}/${myId}`] = newSpotBet;

    await update(ref(db), updates);
  },

  clearBetsGagupan: async () => {
    const { roomId, myId, publicPlayers, gameState } = get();
    if (!roomId || !myId || !gameState || gameState.phase !== 'BETTING') return;

    const db = getFirebaseDb();
    let refundAmount = 0;

    const updates: Record<string, any> = {};
    const spots: ('DONG' | 'SEO' | 'NAM')[] = ['DONG', 'SEO', 'NAM'];

    spots.forEach((spotId) => {
      const myBet = gameState.gagupanBets?.[spotId]?.[myId] || 0;
      if (myBet > 0) {
        refundAmount += myBet;
        updates[`rooms/${roomId}/gameState/gagupanBets/${spotId}/${myId}`] = null;
      }
    });

    if (refundAmount === 0) return;

    const currentScore = publicPlayers[myId]?.score || 0;
    updates[`rooms/${roomId}/publicPlayers/${myId}/score`] = currentScore + refundAmount;

    await update(ref(db), updates);
  },

  confirmBetsGagupan: async () => {
    const { roomId, myId, gameState } = get();
    if (!roomId || !myId || !gameState || gameState.phase !== 'BETTING') return;

    const db = getFirebaseDb();
    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/gameState/gagupanConfirmedPlayers/${myId}`] = true;

    await update(ref(db), updates);
  },

  dealGagupan: async () => {
    const { roomId, isHost, gameState } = get();
    if (!roomId || !isHost || !gameState || gameState.phase !== 'BETTING') return;

    // 베팅이 하나라도 존재하는지 검증
    const hasBet = gameState.gagupanBets && Object.values(gameState.gagupanBets).some(
      (spotBets) => Object.values(spotBets).some((amount) => amount > 0)
    );

    if (!hasBet) {
      console.warn("No bets placed, cannot start deal");
      return;
    }

    const { createDeck, shuffleDeck, dealFromDeck } = await import('@/data/deck');
    let deck = shuffleDeck(createDeck(40));

    const spotIds = ['DONG', 'SEO', 'NAM'];
    const gagupanSpots: Record<string, { cards: string[]; score: number }> = {};

    // 1. 구역별 2장 분배
    spotIds.forEach((spotId) => {
      const { dealt, remaining } = dealFromDeck(deck, 2);
      deck = remaining;
      const sum = dealt.reduce((acc, c) => acc + c.rank, 0);
      gagupanSpots[spotId] = {
        cards: dealt.map((c) => c.id),
        score: sum % 10,
      };
    });

    // 2. 뱅커 2장 분배
    const bankerDeal = dealFromDeck(deck, 2);
    deck = bankerDeal.remaining;
    const bankerSum = bankerDeal.dealt.reduce((acc, c) => acc + c.rank, 0);
    const gagupanBanker = {
      cards: bankerDeal.dealt.map((c) => c.id),
      score: bankerSum % 10,
    };

    const db = getFirebaseDb();
    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/gameState/deck`] = deck.map((c) => c.id);
    updates[`rooms/${roomId}/gameState/gagupanSpots`] = gagupanSpots;
    updates[`rooms/${roomId}/gameState/gagupanBanker`] = gagupanBanker;
    updates[`rooms/${roomId}/gameState/phase`] = 'DRAW_PHASE';

    await update(ref(db), updates);

    // 자동 추가 카드 징구 단계 실행 (비동기)
    setTimeout(() => {
      get().processDrawsGagupan();
    }, 1000);
  },

  processDrawsGagupan: async () => {
    const { roomId, isHost } = get();
    if (!roomId || !isHost) return;

    const db = getFirebaseDb();
    const { dealFromDeck } = await import('@/data/deck');

    // 1. RTDB에서 최신 상태 스냅샷 가져오기
    const snap = await firebaseGet(ref(db, `rooms/${roomId}/gameState`));
    if (!snap.exists()) return;
    const gameState = snap.val() as RTDBGameState;

    let deckIds = [...(gameState.deck || [])];
    const spots = { ...(gameState.gagupanSpots || {}) };
    let banker = { ...(gameState.gagupanBanker || { cards: [], score: 0 }) };

    const spotIds = ['DONG', 'SEO', 'NAM'];

    // 동 -> 서 -> 남 순으로 드로우 검사 및 드로우
    for (const spotId of spotIds) {
      const spot = spots[spotId];
      if (spot && spot.cards.length < 3 && spot.score <= 5 && deckIds.length > 0) {
        const drawn = deckIds.shift()!;
        const newCards = [...spot.cards, drawn];
        const newSum = newCards.reduce((acc, cardId) => acc + parseInt(cardId.split('_')[1], 10), 0);
        spots[spotId] = {
          cards: newCards,
          score: newSum % 10,
        };

        const updates: Record<string, any> = {};
        updates[`rooms/${roomId}/gameState/deck`] = deckIds;
        updates[`rooms/${roomId}/gameState/gagupanSpots`] = spots;
        await update(ref(db), updates);

        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    // 뱅커(북) 추가 드로우
    if (banker.cards.length < 3 && banker.score <= 5 && deckIds.length > 0) {
      const drawn = deckIds.shift()!;
      const newCards = [...banker.cards, drawn];
      const newSum = newCards.reduce((acc, cardId) => acc + parseInt(cardId.split('_')[1], 10), 0);
      banker = {
        cards: newCards,
        score: newSum % 10,
      };

      const updates: Record<string, any> = {};
      updates[`rooms/${roomId}/gameState/deck`] = deckIds;
      updates[`rooms/${roomId}/gameState/gagupanBanker`] = banker;
      await update(ref(db), updates);

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // 결과 계산으로 진입
    const finalUpdates: Record<string, any> = {};
    finalUpdates[`rooms/${roomId}/gameState/phase`] = 'SETTLEMENT';
    await update(ref(db), finalUpdates);

    setTimeout(() => {
      get().evaluateGagupanShowdown();
    }, 1000);
  },

  evaluateGagupanShowdown: async () => {
    const { roomId, isHost, myId, publicPlayers } = get();
    if (!roomId || !isHost || !myId) return;

    const db = getFirebaseDb();
    const snap = await firebaseGet(ref(db, `rooms/${roomId}/gameState`));
    if (!snap.exists()) return;
    const gameState = snap.val() as RTDBGameState;

    const spots = gameState.gagupanSpots;
    const banker = gameState.gagupanBanker;
    const bets = gameState.gagupanBets || {};

    if (!spots || !banker) return;

    const spotIds = ['DONG', 'SEO', 'NAM'];
    const results: Record<string, 'WIN' | 'LOSE' | 'DRAW'> = {};

    // 1. 승패 결과 계산
    spotIds.forEach((spotId) => {
      const spot = spots[spotId];
      if (spot.score > banker.score) results[spotId] = 'WIN';
      else if (spot.score < banker.score) results[spotId] = 'LOSE';
      else results[spotId] = 'DRAW';
    });

    // 2. 칩 정산
    // 방장(Host) = 물주(뱅커)
    const updatedPlayers = { ...publicPlayers };
    let hostBalanceChange = 0;

    Object.entries(bets).forEach(([spotId, spotBets]) => {
      const spotRes = results[spotId];
      Object.entries(spotBets).forEach(([playerId, betAmount]) => {
        if (!updatedPlayers[playerId]) return;

        const playerPrevScore = updatedPlayers[playerId].score;

        if (spotRes === 'WIN') {
          // 플레이어 승리: 플레이어는 베팅금(원금) + 1배배당금을 방장에게서 받아감
          // 베팅 시 이미 플레이어 지갑에서 베팅금(betAmount)이 차감되었으므로,
          // 지갑 복구: playerPrevScore + 2 * betAmount
          // 방장 손실: hostBalanceChange - betAmount
          updatedPlayers[playerId] = {
            ...updatedPlayers[playerId],
            score: playerPrevScore + 2 * betAmount,
          };
          hostBalanceChange -= betAmount;
        } else if (spotRes === 'LOSE') {
          // 플레이어 패배: 베팅금 상실. 이미 베팅 시 지갑에서 빠졌으므로 플레이어 지갑 변동 없음.
          // 방장 이득: hostBalanceChange + betAmount
          hostBalanceChange += betAmount;
        } else if (spotRes === 'DRAW') {
          // 무승부: 플레이어 베팅금 원금 복구
          // 지갑 복구: playerPrevScore + betAmount
          // 방장 변동 없음
          updatedPlayers[playerId] = {
            ...updatedPlayers[playerId],
            score: playerPrevScore + betAmount,
          };
        }
      });
    });

    // 방장(Host) 점수 갱신 적용
    if (updatedPlayers[myId]) {
      updatedPlayers[myId] = {
        ...updatedPlayers[myId],
        score: Math.max(0, updatedPlayers[myId].score + hostBalanceChange),
      };
    }

    const updates: Record<string, any> = {};
    updates[`rooms/${roomId}/gameState/gagupanWinnerResults`] = results;
    updates[`rooms/${roomId}/gameState/phase`] = 'RESULT';
    
    // 플레이어 점수들 업데이트
    Object.keys(updatedPlayers).forEach((uid) => {
      updates[`rooms/${roomId}/publicPlayers/${uid}/score`] = updatedPlayers[uid].score;
    });

    await update(ref(db), updates);
  }
}));
