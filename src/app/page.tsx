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

const MODE_ICONS: Record<GameMode, { hanja: string; sub: string }> = {
  DOLRYEO_DAEGI: { hanja: '鬪', sub: '5장 → 집 짓기 → 족보 대결' },
  GAGU: { hanja: '架', sub: '모듈로10 — 딜러와 1:1 승부' },
  SUTUJEON: { hanja: '數', sub: '80장 트릭테이킹 4인전' },
  GAGUPAN: { hanja: '局', sub: '동/서/남 3구역 베팅 승부' },
};

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
    } else if (selectedMode === 'GAGUPAN') {
      const { useGagupanStore } = await import('@/logic/useGagupanStore');
      useGagupanStore.getState().initGagupan();
    } else {
      initGame(selectedMode, 2);
    }
    router.push(`/game?mode=${selectedMode}`);
  }, [initGame, selectedMode, router]);

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
            radial-gradient(ellipse at 50% 20%, rgba(179,58,58,0.07) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(58,90,140,0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 60%, rgba(200,169,110,0.05) 0%, transparent 50%),
            var(--tujeon-bg-deep)
          `,
        }}
      />

      {/* ── Subtle lattice pattern ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 20px, var(--tujeon-gold-dim) 20px, var(--tujeon-gold-dim) 21px),
            repeating-linear-gradient(-45deg, transparent, transparent 20px, var(--tujeon-gold-dim) 20px, var(--tujeon-gold-dim) 21px)
          `,
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 px-4 w-full max-w-md">

        {/* ════ Title ════ */}
        <div className="text-center anim-fade-up pt-4">
          <h1
            className="text-6xl sm:text-8xl font-black mb-2 tracking-tight"
            style={{
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(135deg, var(--tujeon-gold-light) 0%, var(--tujeon-gold) 40%, var(--tujeon-gold-dim) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 16px rgba(200,169,110,0.3))',
            }}
          >
            투전
          </h1>
          <p
            className="text-xs sm:text-sm tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream-dim)' }}
          >
            朝鮮 傳統 카드 遊戱
          </p>
          <div
            className="mt-2 anim-shimmer h-[1px] w-32 sm:w-48 mx-auto"
            style={{ background: 'linear-gradient(90deg, transparent, var(--tujeon-gold-dim), transparent)' }}
          />
        </div>

        {/* ════ Game Mode Carousel ════ */}
        <div className="flex gap-3 w-full anim-fade-up" style={{ animationDelay: '0.15s' }}>
          {(Object.entries(GAME_MODE_INFO) as [GameMode, typeof GAME_MODE_INFO[GameMode]][]).map(
            ([mode, info]) => {
              const isActive = mode === selectedMode;
              const icon = MODE_ICONS[mode];
              return (
                <button
                  key={mode}
                  disabled={!info.available}
                  className={`ink-panel flex-1 p-3 sm:p-4 flex flex-col items-center gap-1.5 transition-all duration-300 ${
                    info.available
                      ? 'cursor-pointer active:scale-[0.97]'
                      : 'opacity-25 cursor-not-allowed'
                  } ${isActive ? 'ring-2 ring-yellow-600/40 scale-[1.03]' : 'opacity-60 scale-[0.97]'}`}
                  onClick={() => info.available && setSelectedMode(mode)}
                  style={{
                    background: isActive
                      ? 'rgba(200, 169, 110, 0.08)'
                      : 'rgba(26, 21, 18, 0.7)',
                  }}
                >
                  {/* Mode Hanja Icon */}
                  <span
                    className="text-2xl sm:text-3xl font-black"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      color: isActive ? 'var(--tujeon-gold-light)' : 'var(--tujeon-gold-dim)',
                      textShadow: isActive ? '0 0 20px rgba(200,169,110,0.3)' : 'none',
                    }}
                  >
                    {icon.hanja}
                  </span>
                  {/* Mode Name */}
                  <span
                    className="text-sm sm:text-base font-bold"
                    style={{ fontFamily: 'var(--font-serif)', color: isActive ? 'var(--tujeon-gold-light)' : 'var(--tujeon-cream-dim)' }}
                  >
                    {info.label}
                  </span>
                  {/* Description */}
                  <span
                    className="text-[9px] sm:text-[10px] leading-tight text-center"
                    style={{ color: 'var(--tujeon-cream-dim)', opacity: isActive ? 0.9 : 0.5 }}
                  >
                    {icon.sub}
                  </span>
                  {/* Unavailable badge */}
                  {!info.available && (
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full mt-1"
                      style={{
                        background: 'rgba(200,169,110,0.1)',
                        color: 'var(--tujeon-gold-dim)',
                        border: '1px solid rgba(200,169,110,0.15)',
                      }}
                    >
                      준비 중
                    </span>
                  )}
                </button>
              );
            }
          )}
        </div>

        {/* ════ CTA Buttons ════ */}
        <div className="flex flex-col gap-2.5 w-full anim-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex gap-3 w-full">
            <Button size="lg" onClick={handleStartGame} className="flex-1">
              혼자 놀기
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setShowMultiplay(true)} className="flex-1">
              같이 놀기
            </Button>
          </div>
          <button
            onClick={() => setShowTutorial(true)}
            className="text-xs py-2 opacity-50 hover:opacity-100 transition-opacity"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream-dim)' }}
          >
            방법 보기
          </button>
        </div>

        {/* Footer */}
        <p
          className="text-[9px] mt-2 opacity-30"
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
