'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/logic/useGameStore';
import { GAME_MODE_INFO, GameMode } from '@/types/game';
import Button from '@/components/ui/Button';
import TutorialModal from '@/components/game/TutorialModal';

const MultiplayLobby = dynamic(() => import('@/components/multiplayer/MultiplayLobby'), {
  ssr: false,
});

export default function Home() {
  const router = useRouter();
  const initGame = useGameStore((s) => s.initGame);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('DOLRYEO_DAEGI');
  const [showMultiplay, setShowMultiplay] = useState(false);

  const handleStartGame = useCallback(async () => {
    if (selectedMode === 'GAGU') {
      const { useGaguStore } = await import('@/logic/useGaguStore');
      useGaguStore.getState().initGagu();
    } else if (selectedMode === 'SUTUJEON') {
      const { useSutujeonStore } = await import('@/logic/useSutujeonStore');
      useSutujeonStore.getState().initSutujeon();
    } else {
      initGame(selectedMode, 2);
    }
    router.push(`/game?mode=${selectedMode}`);
  }, [initGame, selectedMode, router]);

  // ── Show multiplay lobby ──
  if (showMultiplay) {
    return <MultiplayLobby onBack={() => setShowMultiplay(false)} />;
  }

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden">

      {/* ── Ambient Background ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 20%, rgba(179,58,58,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(58,90,140,0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 60%, rgba(200,169,110,0.06) 0%, transparent 50%),
            var(--tujeon-bg-deep)
          `,
        }}
      />

      {/* ── Floating card decorations (hidden on mobile for perf) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
        {[
          { top: '10%', left: '8%', rotate: '-15deg', opacity: 0.06 },
          { top: '20%', right: '12%', rotate: '20deg', opacity: 0.05 },
          { bottom: '15%', left: '15%', rotate: '10deg', opacity: 0.04 },
          { bottom: '25%', right: '8%', rotate: '-25deg', opacity: 0.07 },
        ].map((style, i) => (
          <div
            key={i}
            className="absolute w-20 h-28 rounded-lg"
            style={{
              ...style,
              background: 'linear-gradient(135deg, var(--tujeon-red), var(--tujeon-blue))',
              border: '2px solid var(--tujeon-gold-dim)',
              transform: `rotate(${style.rotate})`,
            }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-10 px-4 w-full max-w-md">
        {/* Title */}
        <div className="text-center anim-fade-up">
          <h1
            className="text-5xl sm:text-8xl font-black mb-2 sm:mb-3 tracking-tight"
            style={{
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(135deg, var(--tujeon-gold-light) 0%, var(--tujeon-gold) 40%, var(--tujeon-gold-dim) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 12px rgba(200,169,110,0.3))',
            }}
          >
            투전
          </h1>
          <p
            className="text-xs sm:text-lg tracking-[0.2em] sm:tracking-[0.3em] uppercase"
            style={{
              fontFamily: 'var(--font-serif)',
              color: 'var(--tujeon-cream-dim)',
            }}
          >
            朝鮮 傳統 카드 遊戱
          </p>
          <div
            className="mt-2 anim-shimmer h-[1px] w-32 sm:w-48 mx-auto"
            style={{ background: 'linear-gradient(90deg, transparent, var(--tujeon-gold-dim), transparent)' }}
          />
        </div>

        {/* Game Mode Selection */}
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full" style={{ animationDelay: '0.2s' }}>
          {(Object.entries(GAME_MODE_INFO) as [GameMode, typeof GAME_MODE_INFO[GameMode]][]).map(
            ([mode, info]) => (
              <button
                key={mode}
                disabled={!info.available}
                className={`glass-panel p-3 sm:p-4 text-left transition-all ${
                  info.available
                    ? 'hover:bg-white/5 cursor-pointer active:scale-[0.98]'
                    : 'opacity-30 cursor-not-allowed'
                } ${mode === selectedMode ? 'ring-1 ring-yellow-600/40' : ''}`}
                onClick={() => {
                  if (info.available) {
                    setSelectedMode(mode);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-base sm:text-lg font-bold"
                    style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
                  >
                    {info.label}
                  </span>
                  {!info.available && (
                    <span
                      className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(200,169,110,0.1)',
                        color: 'var(--tujeon-gold-dim)',
                        border: '1px solid rgba(200,169,110,0.15)',
                      }}
                    >
                      준비 중
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm mt-0.5 sm:mt-1" style={{ color: 'var(--tujeon-cream-dim)' }}>
                  {info.description}
                </p>
              </button>
            )
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-2.5 sm:gap-3 anim-fade-up w-full" style={{ animationDelay: '0.4s' }}>
          <Button size="lg" onClick={handleStartGame} className="w-full sm:w-auto">
            혼자 플레이 (봇 대전)
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setShowMultiplay(true)} className="w-full sm:w-auto">
            🌐 멀티플레이
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowTutorial(true)}>
            게임 방법 보기
          </Button>
        </div>

        {/* Footer */}
        <p
          className="text-[10px] sm:text-xs mt-4 sm:mt-8 opacity-40"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          © 투전 — 조선 후기 전통 카드 놀이를 현대적으로 재해석
        </p>
      </div>

      {/* Tutorial Modal */}
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </main>
  );
}
