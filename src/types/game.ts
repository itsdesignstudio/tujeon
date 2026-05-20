// ============================================================
// Tujeon (투전) — Shared Type Definitions
// ============================================================

/**
 * Card Suits — the 4 families (목) of the 40-card deck.
 * 人 Person | 魚 Fish | 鳥 Bird | 雉 Pheasant
 */
export type CardSuit = 
  | 'PERSON' | 'FISH' | 'BIRD' | 'PHEASANT' // High-wins suits
  | 'STAR' | 'HORSE' | 'DEER' | 'RABBIT';   // Low-wins suits

/** Suit display metadata */
export const SUIT_INFO: Record<CardSuit, { label: string; hanja: string; color: string }> = {
  PERSON:   { label: '사람', hanja: '人', color: '#c8a96e' },
  FISH:     { label: '물고기', hanja: '魚', color: '#5b8fb9' },
  BIRD:     { label: '새',   hanja: '鳥', color: '#7fb069' },
  PHEASANT: { label: '꿩',   hanja: '雉', color: '#b85c5c' },
  STAR:     { label: '별',   hanja: '星', color: '#d4a017' },
  HORSE:    { label: '말',   hanja: '馬', color: '#8b4513' },
  DEER:     { label: '사슴', hanja: '鹿', color: '#d2b48c' },
  RABBIT:   { label: '토끼', hanja: '兔', color: '#ffb6c1' },
};

/**
 * A single Tujeon card.
 * Rank 10 is the 장 (General/Chief) card.
 */
export interface Card {
  id: string;        // e.g. 'PERSON_10', 'FISH_3'
  suit: CardSuit;
  rank: number;      // 1–10 (10 = 장)
  imageUrl: string;  // Reserved for future illustrated art
}

// ============================================================
// Game Modes
// ============================================================

export type GameMode = 'DOLRYEO_DAEGI' | 'GAGU' | 'SUTUJEON' | 'GAGUPAN';

export const GAME_MODE_INFO: Record<GameMode, { label: string; description: string; available: boolean }> = {
  DOLRYEO_DAEGI: {
    label: '돌려대기',
    description: '5장 중 3장으로 집을 짓고, 남은 2장의 족보로 승부',
    available: true,
  },
  GAGU: {
    label: '가구',
    description: '모듈로 10 점수 (갑오) 비교',
    available: true,
  },
  SUTUJEON: {
    label: '수투전',
    description: '8문양 80장 트릭테이킹 (4인용)',
    available: true,
  },
  GAGUPAN: {
    label: '가구판',
    description: '동/서/남 구역에 칩을 걸어 뱅커(북)와 점수를 겨루는 베팅 게임',
    available: true,
  },
};

// ============================================================
// Jokbo (족보) — Hand Genealogy/Rankings
// ============================================================

/**
 * Jokbo types ordered from strongest to weakest:
 * 장땡 > 땡 > 가보 > 끗 > 망
 */
export type JokboType =
  | 'JANG_TTAENG'  // 장땡 — both cards are 10 (장)
  | 'TTAENG'       // 땡 — pair (same rank)
  | 'GABO'         // 가보 — sum's last digit is 9
  | 'KKUT'         // 끗 — sum's last digit is 1–8
  | 'MANG';        // 망 — sum's last digit is 0 (bust)

export const JOKBO_INFO: Record<JokboType, { label: string; description: string }> = {
  JANG_TTAENG: { label: '장땡',  description: '장(10) 두 장 — 최강 족보' },
  TTAENG:      { label: '땡',   description: '같은 숫자 두 장' },
  GABO:        { label: '가보',  description: '합의 끝자리가 9' },
  KKUT:        { label: '끗',   description: '합의 끝자리가 1~8' },
  MANG:        { label: '망',   description: '합의 끝자리가 0 — 최하 족보' },
};

// ============================================================
// Evaluation Result
// ============================================================

export interface EvaluationResult {
  isHwang: boolean;        // 황 — no valid 3-card combination found
  combination3: Card[];    // The 3 cards forming the "house" (집)
  remaining2: Card[];      // The 2 cards determining jokbo
  jokboType: JokboType;
  jokboScore: number;      // Weighted numeric score for comparison
  jokboLabel: string;      // Human-readable label (e.g. "9땡", "8끗")
}

// ============================================================
// Player
// ============================================================

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  cards: Card[];            // Full 5-card hand
  selectedCardIds: string[]; // IDs of the 3 cards chosen for combination
  isFolded: boolean;
  score: number;            // Chips/money balance
  evaluation: EvaluationResult | null; // Result after evaluation
}

// ============================================================
// Game Phases
// ============================================================

export type GamePhase =
  | 'LOBBY'              // Pre-game menu
  | 'DEAL'               // Cards being dealt (animation)
  | 'MAKE_COMBINATION'   // Players selecting 3 cards
  | 'SHOWDOWN'           // Revealing remaining 2 cards
  | 'RESULT';            // Winner declared, round summary

// ============================================================
// Game State (Zustand Store Shape)
// ============================================================

export interface GameState {
  // ── Core State ──
  gameMode: GameMode;
  deck: Card[];
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  winnerId: string | null;
  roundNumber: number;
  betAmount: number;

  // ── Actions ──
  initGame: (mode: GameMode, playerCount: number) => void;
  dealCards: () => void;
  toggleCardSelection: (playerId: string, cardId: string) => void;
  confirmCombination: (playerId: string) => void;
  declareHwang: (playerId: string) => void;
  evaluateHands: () => void;
  nextRound: () => void;
  resetGame: () => void;
}

// ============================================================
// Gagu Mode Types
// ============================================================

export type GaguPhase = 'INIT' | 'DEAL' | 'PLAYER_ACTION' | 'DEALER_ACTION' | 'SHOWDOWN' | 'RESULT';

export interface GaguPlayerState {
  id: string;
  isDealer: boolean;
  cards: Card[];
  score: number;       // Current modulo 10 score
  hasStood: boolean;   // Stand status
}

export interface GaguState {
  deck: Card[];
  player: GaguPlayerState | null;
  dealer: GaguPlayerState | null;
  gamePhase: GaguPhase;
  winnerId: string | 'DRAW' | null;
  roundNumber: number;
  betAmount: number;

  // Actions
  initGagu: () => void;
  dealCards: () => void;
  hit: () => void;
  stand: () => void;
  executeDealerTurn: () => void;
  evaluateGagu: () => void;
  nextRound: () => void;
  resetGagu: () => void;
}

// ============================================================
// Sutujeon Mode Types
// ============================================================

export interface PlayAction {
  playerId: string;
  card: Card;
}

export interface CurrentTrick {
  ledSuit: CardSuit | null;   // Suit led by the first player
  actions: PlayAction[];      // Cards played in this trick (up to 4)
}

export interface SutujeonPlayer {
  id: string;
  name: string;
  isBot: boolean;
  cards: Card[];
  tricksWon: number;          // Number of tricks won (Score)
}

export type SutujeonPhase = 'INIT' | 'DEAL' | 'PLAY' | 'TRICK_EVAL' | 'RESULT';

export interface SutujeonState {
  deck: Card[];
  players: SutujeonPlayer[];
  currentTrick: CurrentTrick;
  gamePhase: SutujeonPhase;
  leadPlayerIndex: number;
  currentPlayerIndex: number;
  totalTricksPlayed: number;

  // Actions
  initSutujeon: () => void;
  dealCards: () => void;
  playCard: (playerId: string, cardId: string) => void;
  executeBotTurn: () => void;
  evaluateTrick: () => void;
  resetSutujeon: () => void;
}

// ============================================================
// Gagupan Mode Types
// ============================================================

export type BettingSpotId = 'DONG' | 'SEO' | 'NAM';

// 베팅 구역 상태
export interface BettingSpot {
  id: BettingSpotId;
  cards: Card[];
  score: number;
  // 각 플레이어가 이 구역에 베팅한 금액 (key: playerId, value: chipAmount)
  bets: Record<string, number>; 
}

// 물주(뱅커) 상태
export interface BankerHand {
  cards: Card[];
  score: number;
}

export type GagupanPhase = 'BETTING' | 'DEAL' | 'DRAW_PHASE' | 'SETTLEMENT' | 'RESULT';

// 가구판 전역 상태 스토어
export interface GagupanState {
  gamePhase: GagupanPhase;
  deck: Card[];
  spots: Record<BettingSpotId, BettingSpot>;
  banker: BankerHand;
  playerBalances: Record<string, number>; // 유저들의 보유 칩 (key: playerId)
  winnerResults: Record<BettingSpotId, 'WIN' | 'LOSE' | 'DRAW' | null>;
  betAmount: number; // 현재 설정된 베팅 단위
  roundNumber: number;

  // Actions
  initGagupan: () => void;
  placeBet: (spotId: BettingSpotId, amount: number) => void;
  clearBets: () => void;
  confirmBets: () => void;
  dealCards: () => void;
  processDraws: () => Promise<void>;
  evaluateGagupan: () => void;
  nextRound: () => void;
  resetGagupan: () => void;
}
