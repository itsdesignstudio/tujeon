'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/logic/useGameStore';
import { useGaguStore } from '@/logic/useGaguStore';
import { useSutujeonStore } from '@/logic/useSutujeonStore';
import { useGagupanStore } from '@/logic/useGagupanStore';
import GameBoard from '@/components/game/GameBoard';
import GaguBoard from '@/components/game/GaguBoard';
import SutujeonBoard from '@/components/game/SutujeonBoard';
import GagupanBoard from '@/components/game/GagupanBoard';

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
  const { spots: gagupanSpots, initGagupan } = useGagupanStore();

  // ── Multiplay Mode ──
  if (isMultiplay) {
    return <MultiplayGameWrapper mode={mode} />;
  }

  // ── Local Mode ──

  useEffect(() => {
    if (mode === 'GAGU') {
      if (!gaguPlayer) initGagu();
    } else if (mode === 'SUTUJEON') {
      if (sutujeonPlayers.length === 0) initSutujeon();
    } else if (mode === 'GAGUPAN') {
      if (!gagupanSpots || Object.keys(gagupanSpots.DONG.bets).length === 0) initGagupan();
    } else {
      if (players.length === 0) initGame('DOLRYEO_DAEGI', 2);
    }
  }, [mode, players.length, gaguPlayer, sutujeonPlayers.length, gagupanSpots, initGame, initGagu, initSutujeon, initGagupan]);

  // Auto-deal when entering from lobby
  useEffect(() => {
    if (mode === 'GAGU') {
      if (gaguPhase === 'INIT') {
        const timer = setTimeout(() => gaguDealCards(), 500);
        return () => clearTimeout(timer);
      }
    } else if (mode === 'SUTUJEON') {
      if (sutujeonPhase === 'INIT' && sutujeonPlayers.length > 0) {
        const timer = setTimeout(() => sutujeonDealCards(), 500);
        return () => clearTimeout(timer);
      }
    } else if (mode === 'GAGUPAN') {
      // Gagupan waits for player bets, no auto-deal here
      return;
    } else {
      if (players.length > 0 && gamePhase === 'LOBBY') {
        const timer = setTimeout(() => dealCards(), 500);
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
    } else if (mode === 'GAGUPAN') {
      return;
    } else {
      if (players.length === 0 && gamePhase === 'LOBBY') return;
    }
  }, [mode, players.length, gamePhase, gaguPlayer, gaguPhase, sutujeonPlayers.length, sutujeonPhase, router]);

  // Loading states
  if (mode === 'GAGU' && !gaguPlayer) {
    return <LoadingScreen text="가구 준비 중..." />;
  }
  if (mode === 'SUTUJEON' && sutujeonPlayers.length === 0) {
    return <LoadingScreen text="수투전 준비 중..." />;
  }
  if (mode === 'GAGUPAN' && !gagupanSpots) {
    return <LoadingScreen text="가구판 준비 중..." />;
  }
  if (mode === 'DOLRYEO_DAEGI' && players.length === 0) {
    return <LoadingScreen text="투전 준비 중..." />;
  }

  // Each board now contains its own status bar with back button
  if (mode === 'GAGU') return <GaguBoard />;
  if (mode === 'SUTUJEON') return <SutujeonBoard />;
  if (mode === 'GAGUPAN') return <GagupanBoard />;
  return <GameBoard />;
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3" style={{ background: 'var(--tujeon-bg-deep)' }}>
      <div
        className="text-lg sm:text-2xl font-bold anim-fade-up"
        style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
      >
        {text}
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: 'var(--tujeon-gold-dim)',
              animation: 'pulseGlow 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<LoadingScreen text="로딩 중..." />}>
      <GameContent />
    </Suspense>
  );
}
