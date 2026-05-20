'use client';

import React from 'react';
import { Player, SUIT_INFO } from '@/types/game';

interface JokboDisplayProps {
  players: Player[];
  winnerId: string | null;
}

function getJokboBadgeClass(type: string): string {
  switch (type) {
    case 'JANG_TTAENG': return 'jang-ttaeng';
    case 'TTAENG':      return 'ttaeng';
    case 'GABO':        return 'gabo';
    case 'KKUT':        return 'kkut';
    case 'MANG':        return 'mang';
    case 'hwang':       return 'hwang';
    default:            return '';
  }
}

export default function JokboDisplay({ players, winnerId }: JokboDisplayProps) {
  return (
    <div className="anim-scale-in flex items-stretch justify-center gap-4 w-full px-2 max-w-md mx-auto">
      {players.map((player) => {
        const isWinner = player.id === winnerId;
        const eval_ = player.evaluation;

        return (
          <div
            key={player.id}
            className={`ink-panel flex flex-col items-center gap-2 px-3 py-3 flex-1 transition-all ${
              isWinner
                ? 'ring-2 ring-yellow-500/40'
                : 'opacity-50'
            }`}
            style={{
              background: isWinner
                ? 'rgba(200, 169, 110, 0.08)'
                : 'rgba(26, 21, 18, 0.7)',
            }}
          >
            {/* Player name */}
            <div
              className="text-xs font-bold truncate max-w-[100px] flex items-center gap-1"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}
            >
              {isWinner && <span className="text-sm">👑</span>}
              {player.name}
            </div>

            {/* Remaining 2 cards — using consistent mini-card style */}
            {eval_ && !eval_.isHwang && (
              <div className="flex gap-1">
                {eval_.remaining2.map((card) => {
                  const suitInfo = SUIT_INFO[card.suit];
                  return (
                    <div
                      key={card.id}
                      className="rounded flex flex-col items-center justify-center"
                      style={{
                        width: 36,
                        height: 52,
                        background: 'linear-gradient(155deg, #f8ecd4, #e4ceaa)',
                        border: `1.5px solid ${suitInfo.color}`,
                        boxShadow: isWinner ? 'var(--shadow-glow-gold)' : 'var(--shadow-card)',
                      }}
                    >
                      <span
                        className="text-xs font-black leading-none"
                        style={{ fontFamily: 'var(--font-serif)', color: suitInfo.color }}
                      >
                        {card.rank === 10 ? '장' : card.rank}
                      </span>
                      <span
                        className="text-[8px] opacity-50 leading-none mt-0.5"
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {suitInfo.hanja}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Jokbo badge */}
            {eval_ && (
              <div className="anim-result-reveal">
                <div
                  className={`jokbo-badge-sm ${getJokboBadgeClass(
                    eval_.isHwang ? 'hwang' : eval_.jokboType
                  )}`}
                >
                  {eval_.jokboLabel}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
