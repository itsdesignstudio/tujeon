'use client';

import React from 'react';
import { Player } from '@/types/game';

interface JokboDisplayProps {
  players: Player[];
  winnerId: string | null;
}

export default function JokboDisplay({ players, winnerId }: JokboDisplayProps) {
  return (
    <div className="anim-scale-in flex items-center justify-center gap-3 sm:gap-6 w-full px-2">
      {players.map((player) => {
        const isWinner = player.id === winnerId;
        const eval_ = player.evaluation;

        return (
          <div
            key={player.id}
            className={`flex flex-col items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-4 rounded-xl transition-all ${
              isWinner
                ? 'ring-2 ring-yellow-500/50 bg-yellow-500/5'
                : 'opacity-50'
            }`}
          >
            {/* Player name */}
            <div
              className="text-xs sm:text-base font-bold truncate max-w-[80px] sm:max-w-none"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}
            >
              {player.name}
              {isWinner && ' 👑'}
            </div>

            {/* Remaining 2 cards display — compact */}
            {eval_ && !eval_.isHwang && (
              <div className="flex gap-1">
                {eval_.remaining2.map((card) => (
                  <div
                    key={card.id}
                    className="w-9 h-13 sm:w-12 sm:h-18 rounded flex flex-col items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, var(--tujeon-cream), #e8d5b0)',
                      border: `1.5px solid ${
                        card.suit === 'PERSON' ? 'var(--suit-person)' :
                        card.suit === 'FISH' ? 'var(--suit-fish)' :
                        card.suit === 'BIRD' ? 'var(--suit-bird)' :
                        'var(--suit-pheasant)'
                      }`,
                      boxShadow: isWinner ? 'var(--shadow-glow-gold)' : 'var(--shadow-card)',
                    }}
                  >
                    <span
                      className="text-sm sm:text-lg font-black"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        color: 'var(--tujeon-black)',
                      }}
                    >
                      {card.rank === 10 ? '장' : card.rank}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Jokbo badge — compact */}
            {eval_ && (
              <div
                className={`jokbo-badge-sm ${getJokboBadgeClass(
                  eval_.isHwang ? 'hwang' : eval_.jokboType
                )}`}
              >
                {eval_.jokboLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
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
