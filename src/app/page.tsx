'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/logic/useGameStore';
import { GAME_MODE_INFO, GameMode } from '@/types/game';
import Button from '@/components/ui/Button';
import TutorialModal from '@/components/game/TutorialModal';

export default function Home() {
  const router = useRouter();
  const initGame = useGameStore((s) => s.initGame);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('DOLRYEO_DAEGI');
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
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

      {/* ── Floating card decorations ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
      <div className="relative z-10 flex flex-col items-center gap-10 px-4">
        {/* Title */}
        <div className="text-center anim-fade-up">
          <h1
            className="text-8xl font-black mb-3 tracking-tight"
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
            className="text-lg tracking-[0.3em] uppercase"
            style={{
              fontFamily: 'var(--font-serif)',
              color: 'var(--tujeon-cream-dim)',
            }}
          >
            朝鮮 傳統 카드 遊戱
          </p>
          <div
            className="mt-2 anim-shimmer h-[1px] w-48 mx-auto"
            style={{ background: 'linear-gradient(90deg, transparent, var(--tujeon-gold-dim), transparent)' }}
          />
        </div>

        {/* Game Mode Selection */}
        <div className="flex flex-col gap-3 w-full max-w-sm" style={{ animationDelay: '0.2s' }}>
          {(Object.entries(GAME_MODE_INFO) as [GameMode, typeof GAME_MODE_INFO[GameMode]][]).map(
            ([mode, info]) => (
              <button
                key={mode}
                disabled={!info.available}
                className={`glass-panel p-4 text-left transition-all ${
                  info.available
                    ? 'hover:bg-white/5 cursor-pointer'
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
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
                  >
                    {info.label}
                  </span>
                  {!info.available && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
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
                <p className="text-sm mt-1" style={{ color: 'var(--tujeon-cream-dim)' }}>
                  {info.description}
                </p>
              </button>
            )
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3 anim-fade-up" style={{ animationDelay: '0.4s' }}>
          <Button size="lg" onClick={handleStartGame}>
            게임 시작
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowTutorial(true)}>
            게임 방법 보기
          </Button>
        </div>

        {/* Footer */}
        <p
          className="text-xs mt-8 opacity-40"
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
