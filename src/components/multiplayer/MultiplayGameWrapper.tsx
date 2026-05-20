'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import MultiplayGaguBoard from '@/components/multiplayer/MultiplayGaguBoard';
import MultiplayGameBoard from '@/components/multiplayer/MultiplayGameBoard';
import MultiplaySutujeonBoard from '@/components/multiplayer/MultiplaySutujeonBoard';
import MultiplayGagupanBoard from '@/components/multiplayer/MultiplayGagupanBoard';
import Button from '@/components/ui/Button';

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
    if (gameState && gameState.phase !== 'LOBBY' && publicPlayers && Object.keys(publicPlayers).length < 2) {
      setPlayerLeft(true);
      const timer = setTimeout(() => {
        leaveRoom();
        router.push('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState, publicPlayers, leaveRoom, router]);

  const handleLeave = () => {
    useMultiplayStore.getState().leaveRoom();
    router.push('/');
  };

  if (!roomId || !gameState) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4" style={{ background: 'var(--tujeon-bg-deep)' }}>
        <div className="flex flex-col items-center gap-3 anim-fade-up">
          <div className="flex gap-1.5">
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
          <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
            방에 연결 중...
          </span>
          <button
            onClick={() => router.push('/')}
            className="text-xs opacity-50 hover:opacity-100 transition-opacity mt-2"
            style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Overlay: Player left
  const PlayerLeftOverlay = playerLeft ? (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="flex flex-col items-center gap-3 anim-fade-up text-center px-6">
        <span className="text-4xl">⚠️</span>
        <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-red-light)' }}>
          상대방이 방을 나갔습니다
        </div>
        <div className="text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          잠시 후 홈으로 이동합니다...
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--tujeon-red)',
                animation: 'pulseGlow 1s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  ) : null;

  // Overlay: Reconnecting
  const ReconnectingOverlay = isOpponentOffline && !playerLeft ? (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="flex flex-col items-center gap-4 anim-fade-up text-center px-6">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: 'var(--tujeon-gold-dim)',
                animation: 'pulseGlow 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
          상대방 연결 대기 중...
        </div>
        <div className="text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          잠시 후에도 돌아오지 않으면 나갈 수 있습니다
        </div>
        <Button variant="danger" size="sm" onClick={handleLeave} className="mt-2">
          게임 종료하고 나가기
        </Button>
      </div>
    </div>
  ) : null;

  const Board = mode === 'GAGU'
    ? MultiplayGaguBoard
    : mode === 'SUTUJEON'
    ? MultiplaySutujeonBoard
    : mode === 'GAGUPAN'
    ? MultiplayGagupanBoard
    : MultiplayGameBoard;

  return (
    <>
      {PlayerLeftOverlay}
      {ReconnectingOverlay}
      <Board />
    </>
  );
}
