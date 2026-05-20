'use client';

import React from 'react';
import { RTDBPublicPlayer } from '@/logic/useMultiplayStore';

interface PlayerListProps {
  players: Record<string, RTDBPublicPlayer>;
  myId: string | null;
  hostId?: string | null;
}

export default function PlayerList({ players, myId, hostId }: PlayerListProps) {
  const entries = Object.entries(players);

  return (
    <div className="flex flex-col gap-2 w-full">
      {entries.map(([uid, player], idx) => {
        const isMe = uid === myId;
        const isHost = uid === hostId;
        const isOffline = player.isOnline === false;

        return (
          <div
            key={uid}
            className={`ink-panel flex items-center gap-3 px-3 py-2.5 transition-all ${
              isMe ? 'ring-1 ring-yellow-600/30' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative"
              style={{
                fontFamily: 'var(--font-serif)',
                background: isMe
                  ? 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))'
                  : 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
                color: isMe ? 'var(--tujeon-black)' : 'var(--tujeon-cream)',
              }}
            >
              {player.name.charAt(0).toUpperCase()}
              {/* Host crown */}
              {isHost && (
                <span className="absolute -top-1.5 -right-1 text-[10px]">👑</span>
              )}
            </div>

            {/* Name + Status */}
            <div className="flex flex-col min-w-0 flex-1">
              <div
                className="font-bold text-sm flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--font-serif)',
                  color: isOffline ? 'var(--tujeon-cream-dim)' : 'var(--tujeon-cream)',
                }}
              >
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{player.name}</span>
                {isMe && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(200,169,110,0.15)', color: 'var(--tujeon-gold-dim)' }}>
                    나
                  </span>
                )}
              </div>
              {isHost && (
                <span className="text-[9px] tracking-wider" style={{ color: 'var(--tujeon-gold-dim)' }}>방장</span>
              )}
            </div>

            {/* Online/Offline indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isOffline && (
                <span className="text-[9px] text-red-400 px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                  오프라인
                </span>
              )}
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: isOffline ? 'var(--tujeon-red)' : '#7fb069',
                  boxShadow: isOffline ? 'none' : '0 0 8px rgba(127,176,105,0.5)',
                  opacity: isOffline ? 0.6 : 1,
                }}
              />
            </div>
          </div>
        );
      })}

      {entries.length === 0 && (
        <div className="text-center py-6 flex flex-col items-center gap-2">
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
          <span className="text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
            플레이어 대기 중...
          </span>
        </div>
      )}
    </div>
  );
}
