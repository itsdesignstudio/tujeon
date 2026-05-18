'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/logic/useGameStore';
import { useGaguStore } from '@/logic/useGaguStore';
import { useSutujeonStore } from '@/logic/useSutujeonStore';
import GameBoard from '@/components/game/GameBoard';
import GaguBoard from '@/components/game/GaguBoard';
import SutujeonBoard from '@/components/game/SutujeonBoard';

const MultiplayGameWrapper = dynamic(() => import('@/components/multiplayer/MultiplayGameWrapper'), {
  ssr: false,
});

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'DOLRYEO_DAEGI';
  const isMultiplay = searchParams.get('multiplay') === 'true';

  const { players, gamePhase, dealCards, initGame } = useGameStore();
  const { player: gaguPlayer, gamePhase: gaguPhase, dealCards: gaguDealCards, initGagu } = useGaguStore();
  const { players: sutujeonPlayers, gamePhase: sutujeonPhase, dealCards: sutujeonDealCards, initSutujeon } = useSutujeonStore();

  // ── Multiplay Mode ──
  if (isMultiplay) {
    return <MultiplayGameWrapper mode={mode} />;
  }

  // ── Local Mode (existing logic, unchanged) ──

  useEffect(() => {
    if (mode === 'GAGU') {
      if (!gaguPlayer) {
        initGagu();
      }
    } else if (mode === 'SUTUJEON') {
      if (sutujeonPlayers.length === 0) {
        initSutujeon();
      }
    } else {
      if (players.length === 0) {
        initGame('DOLRYEO_DAEGI', 2);
      }
    }
  }, [mode, players.length, gaguPlayer, sutujeonPlayers.length, initGame, initGagu, initSutujeon]);

  // Auto-deal when entering from lobby
  useEffect(() => {
    if (mode === 'GAGU') {
      if (gaguPhase === 'INIT') {
        const timer = setTimeout(() => {
          gaguDealCards();
        }, 500);
        return () => clearTimeout(timer);
      }
    } else if (mode === 'SUTUJEON') {
      if (sutujeonPhase === 'INIT' && sutujeonPlayers.length > 0) {
        const timer = setTimeout(() => {
          sutujeonDealCards();
        }, 500);
        return () => clearTimeout(timer);
      }
    } else {
      if (players.length > 0 && gamePhase === 'LOBBY') {
        const timer = setTimeout(() => {
          dealCards();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [mode, players.length, gamePhase, dealCards, gaguPhase, gaguDealCards, sutujeonPhase, sutujeonPlayers.length, sutujeonDealCards]);

  // Handle game reset → redirect to home
  useEffect(() => {
    if (mode === 'GAGU') {
      if (!gaguPlayer && gaguPhase === 'INIT') return;
    } else if (mode === 'SUTUJEON') {
      if (sutujeonPlayers.length === 0 && sutujeonPhase === 'INIT') return;
    } else {
      if (players.length === 0 && gamePhase === 'LOBBY') return;
    }
  }, [mode, players.length, gamePhase, gaguPlayer, gaguPhase, sutujeonPlayers.length, sutujeonPhase, router]);

  const handleGoHome = () => {
    if (mode === 'GAGU') {
      useGaguStore.getState().resetGagu();
    } else if (mode === 'SUTUJEON') {
      useSutujeonStore.getState().resetSutujeon();
    } else {
      useGameStore.getState().resetGame();
    }
    router.push('/');
  };

  const BackButton = (
    <button
      onClick={handleGoHome}
      className="absolute top-3 left-3 sm:top-4 sm:left-4 z-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-panel flex items-center gap-1.5 sm:gap-2 hover:bg-white/10 transition-colors text-xs sm:text-sm"
      style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}
    >
      <span className="text-sm sm:text-lg">←</span>
      <span>홈으로</span>
    </button>
  );

  if (mode === 'GAGU') {
    if (!gaguPlayer) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--tujeon-bg-deep)' }}>
          <div className="text-lg sm:text-2xl font-bold anim-fade-up" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
            가구 준비 중...
          </div>
        </div>
      );
    }
    return (
      <>
        {BackButton}
        <GaguBoard />
      </>
    );
  }

  if (mode === 'SUTUJEON') {
    if (sutujeonPlayers.length === 0) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--tujeon-bg-deep)' }}>
          <div className="text-lg sm:text-2xl font-bold anim-fade-up" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
            수투전 준비 중...
          </div>
        </div>
      );
    }
    return (
      <>
        {BackButton}
        <SutujeonBoard />
      </>
    );
  }

  if (players.length === 0) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--tujeon-bg-deep)' }}>
        <div className="text-lg sm:text-2xl font-bold anim-fade-up" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
          투전 준비 중...
        </div>
      </div>
    );
  }

  return (
    <>
      {BackButton}
      <GameBoard />
    </>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-black text-white">로딩 중...</div>}>
      <GameContent />
    </Suspense>
  );
}

