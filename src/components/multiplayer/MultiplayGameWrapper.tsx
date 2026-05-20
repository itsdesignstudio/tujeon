'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import MultiplayGaguBoard from '@/components/multiplayer/MultiplayGaguBoard';
import MultiplayGameBoard from '@/components/multiplayer/MultiplayGameBoard';
import MultiplaySutujeonBoard from '@/components/multiplayer/MultiplaySutujeonBoard';

export default function MultiplayGameWrapper({ mode }: { mode: string }) {
  const router = useRouter();
  const { myId, roomId, gameState, publicPlayers, leaveRoom } = useMultiplayStore();
  const [playerLeft, setPlayerLeft] = React.useState(false);

  const isOpponentOffline = React.useMemo(() => {
    if (!myId || !publicPlayers || gameState?.phase === 'LOBBY') return false;
    const opponents = Object.entries(publicPlayers).filter(([id]) => id !== myId);
    return opponents.length > 0 && opponents.some(([, p]) => p.isOnline === false);
  }, [myId, publicPlayers, gameState?.phase]);

  React.useEffect(() => {
    // If the game has started (not LOBBY) and players drop below 2
    if (gameState && gameState.phase !== 'LOBBY' && publicPlayers && Object.keys(publicPlayers).length < 2) {
      setPlayerLeft(true);
      const timer = setTimeout(() => {
        leaveRoom();
        router.push('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState, publicPlayers, leaveRoom, router]);

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

  const PlayerLeftOverlay = playerLeft ? (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="text-xl sm:text-2xl font-bold mb-4 anim-fade-up text-center" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-red-light)' }}>
        상대방이 방을 나갔습니다.<br/>
        게임을 종료합니다.
      </div>
      <div className="text-sm anim-pulse-glow" style={{ color: 'var(--tujeon-cream-dim)' }}>
        잠시 후 홈으로 이동합니다...
      </div>
    </div>
  ) : null;

  const ReconnectingOverlay = isOpponentOffline && !playerLeft ? (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="text-xl sm:text-2xl font-bold mb-4 anim-fade-up text-center" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
        상대방의 연결이 끊어졌습니다.<br/>
        재연결을 기다리는 중...
      </div>
      <div className="text-sm anim-pulse-glow mb-8" style={{ color: 'var(--tujeon-cream-dim)' }}>
        잠시 후에도 돌아오지 않으면 게임을 종료할 수 있습니다.
      </div>
      <button
        onClick={() => {
          useMultiplayStore.getState().leaveRoom();
          router.push('/');
        }}
        className="px-6 py-2 rounded-full border border-red-500/50 hover:bg-red-500/20 text-red-400 transition-colors"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        게임 종료하고 나가기
      </button>
    </div>
  ) : null;

  if (mode === 'GAGU') {
    return (
      <>
        {PlayerLeftOverlay}
        {ReconnectingOverlay}
        {BackButton}
        <MultiplayGaguBoard />
      </>
    );
  }

  if (mode === 'SUTUJEON') {
    return (
      <>
        {PlayerLeftOverlay}
        {ReconnectingOverlay}
        {BackButton}
        <MultiplaySutujeonBoard />
      </>
    );
  }

  return (
    <>
      {PlayerLeftOverlay}
      {ReconnectingOverlay}
      {BackButton}
      <MultiplayGameBoard />
    </>
  );
}
