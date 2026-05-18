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

        return (
          <div
            key={uid}
            className={`glass-panel flex items-center gap-3 px-4 py-3 transition-all ${
              isMe ? 'ring-1 ring-yellow-600/30' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                fontFamily: 'var(--font-serif)',
                background: isMe
                  ? 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))'
                  : 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
                color: isMe ? 'var(--tujeon-black)' : 'var(--tujeon-cream)',
              }}
            >
              P{idx + 1}
            </div>

            {/* Name */}
            <div className="flex flex-col min-w-0 flex-1">
              <span
                className="font-bold text-sm truncate"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}
              >
                {player.name}
                {isMe && (
                  <span className="text-[10px] ml-1.5 opacity-60">(나)</span>
                )}
              </span>
              {isHost && (
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--tujeon-gold-dim)' }}
                >
                  방장
                </span>
              )}
            </div>

            {/* Ready indicator */}
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: 'var(--tujeon-gold)',
                boxShadow: '0 0 8px rgba(200,169,110,0.5)',
              }}
            />
          </div>
        );
      })}

      {entries.length === 0 && (
        <div className="text-center text-sm py-4" style={{ color: 'var(--tujeon-cream-dim)' }}>
          플레이어 대기 중...
        </div>
      )}
    </div>
  );
}
