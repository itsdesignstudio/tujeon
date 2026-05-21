// ============================================================
// Tujeon (투전) — Timer & Difficulty Settings
// ============================================================

import { Difficulty } from '@/types/game';

// 돌려대기: 3장 조합(집 짓기) 제한 시간 (단위: 초)
export const DOLRYEO_DAEGI_TIMER_CONFIG: Record<Difficulty, number | null> = {
  EASY: null,    // 제한 시간 없음 (기존과 동일)
  MEDIUM: 20,    // 20초 후 자동 '황'
  HARD: 10       // 10초 후 자동 '황'
};

// 가구: 추가 카드(Hit/Stand) 선택 제한 시간 (단위: 초)
export const GAGU_TIMER_CONFIG: Record<Difficulty, number | null> = {
  EASY: null,    // 제한 시간 없음 (기존과 동일)
  MEDIUM: 10,    // 10초 후 자동 'Stand'
  HARD: 5        // 5초 후 자동 'Stand'
};
