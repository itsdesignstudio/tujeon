'use client';

import React from 'react';
import { Player } from '@/types/game';

interface JokboDisplayProps {
  players: Player[];
  winnerId: string | null;
}

export default function JokboDisplay({ players, winnerId }: JokboDisplayProps) {
  const winner = players.find((p) => p.id === winnerId);

  return (
    <div className="anim-scale-in flex flex-col items-center gap-6 p-8">
      {/* Winner Announcement */}
      {winner && (
        <div className="text-center">
          <div
            className="text-4xl font-black mb-2"
            style={{
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            🎊 승리 🎊
          </div>
          <div
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
          >
            {winner.name}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="flex gap-8 items-start">
        {players.map((player) => {
          const isWinner = player.id === winnerId;
          const eval_ = player.evaluation;

          return (
            <div
              key={player.id}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl transition-all ${
                isWinner
                  ? 'ring-2 ring-yellow-500/50 bg-yellow-500/5'
                  : 'opacity-60'
              }`}
            >
              {/* Player name */}
              <div
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}
              >
                {player.name}
                {isWinner && ' 👑'}
              </div>

              {/* Remaining 2 cards display */}
              {eval_ && !eval_.isHwang && (
                <div className="flex gap-2">
                  {eval_.remaining2.map((card) => (
                    <div
                      key={card.id}
                      className="w-14 h-20 rounded-md flex flex-col items-center justify-center"
                      style={{
                        background: 'linear-gradient(145deg, var(--tujeon-cream), #e8d5b0)',
                        border: `2px solid ${
                          card.suit === 'PERSON' ? 'var(--suit-person)' :
                          card.suit === 'FISH' ? 'var(--suit-fish)' :
                          card.suit === 'BIRD' ? 'var(--suit-bird)' :
                          'var(--suit-pheasant)'
                        }`,
                        boxShadow: isWinner ? 'var(--shadow-glow-gold)' : 'var(--shadow-card)',
                      }}
                    >
                      <span
                        className="text-xl font-black"
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

              {/* Jokbo badge */}
              {eval_ && (
                <div
                  className={`jokbo-badge text-base ${getJokboBadgeClass(
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
