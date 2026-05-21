'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/logic/useGameStore';
import { useGaguStore } from '@/logic/useGaguStore';
import { DOLRYEO_DAEGI_TIMER_CONFIG, GAGU_TIMER_CONFIG } from '@/config/timer';

export function GameTimerController() {
  const {
    gameMode,
    gamePhase,
    difficulty,
    tickTimer,
    startTimer,
    stopTimer,
    isTimerRunning,
  } = useGameStore();

  // 가구 모드 페이즈를 가져와 타이머 트리거에 활용
  const gaguPhase = useGaguStore((s) => s.gamePhase);

  // 페이즈 또는 게임 모드, 난이도가 변경될 때마다 타이머를 설정하고 구동
  useEffect(() => {
    stopTimer(); // 기존 타이머 초기화

    let initialTime: number | null = null;

    if (gameMode === 'DOLRYEO_DAEGI' && gamePhase === 'MAKE_COMBINATION') {
      initialTime = DOLRYEO_DAEGI_TIMER_CONFIG[difficulty];
    } else if (gameMode === 'GAGU' && gaguPhase === 'PLAYER_ACTION') {
      initialTime = GAGU_TIMER_CONFIG[difficulty];
    }

    if (initialTime !== null) {
      startTimer(initialTime);
    }

    return () => stopTimer();
  }, [gamePhase, gaguPhase, gameMode, difficulty, startTimer, stopTimer]);

  // 실시간 1초 카운트다운 루프
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  return null; // 백그라운드 로직 컨트롤러이므로 UI는 렌더링하지 않음
}
