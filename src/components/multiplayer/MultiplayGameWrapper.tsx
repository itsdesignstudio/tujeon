'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import MultiplayGaguBoard from '@/components/multiplayer/MultiplayGaguBoard';
import MultiplayGameBoard from '@/components/multiplayer/MultiplayGameBoard';

export default function MultiplayGameWrapper({ mode }: { mode: string }) {
  const router = useRouter();
  const { roomId, gameState } = useMultiplayStore();

  if (!roomId || !gameState) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--tujeon-bg-deep)' }}>
        <div className="text-center anim-fade-up">
          <div className="text-lg sm:text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
            방에 연결 중...
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const BackButton = (
    <button
      onClick={() => {
        useMultiplayStore.getState().leaveRoom();
        router.push('/');
      }}
      className="absolute top-3 left-3 sm:top-4 sm:left-4 z-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-panel flex items-center gap-1.5 sm:gap-2 hover:bg-white/10 transition-colors text-xs sm:text-sm"
      style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}
    >
      <span className="text-sm sm:text-lg">←</span>
      <span>나가기</span>
    </button>
  );

  if (mode === 'GAGU') {
    return (
      <>
        {BackButton}
        <MultiplayGaguBoard />
      </>
    );
  }

  return (
    <>
      {BackButton}
      <MultiplayGameBoard />
    </>
  );
}
