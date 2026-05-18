'use client';

import React from 'react';
import { Card, SUIT_INFO } from '@/types/game';

interface CardComponentProps {
  card: Card;
  isFaceUp?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  dealDelay?: number;    // Staggered deal animation delay (ms)
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const RANK_DISPLAY: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九', 10: '장',
};

export default function CardComponent({
  card,
  isFaceUp = true,
  isSelected = false,
  isDisabled = false,
  onClick,
  dealDelay = 0,
  size = 'md',
}: CardComponentProps) {
  const suitInfo = SUIT_INFO[card.suit];
  const suitClass = `suit-${card.suit.toLowerCase()}`;
  const rankDisplay = RANK_DISPLAY[card.rank] || String(card.rank);

  const sizeStyles = {
    xs: { width: 48, height: 72, fontSize: '0.6rem', hanjaSize: '1rem', rankSize: '0.75rem' },
    sm: { width: 60, height: 90, fontSize: '0.75rem', hanjaSize: '1.2rem', rankSize: '0.9rem' },
    md: { width: 80, height: 120, fontSize: '0.85rem', hanjaSize: '1.6rem', rankSize: '1.1rem' },
    lg: { width: 100, height: 150, fontSize: '1rem', hanjaSize: '2rem', rankSize: '1.4rem' },
  };

  const s = sizeStyles[size];

  return (
    <div
      className={`card-base anim-deal ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      style={{
        width: s.width,
        height: s.height,
        animationDelay: `${dealDelay}ms`,
      }}
      onClick={!isDisabled ? onClick : undefined}
      role="button"
      aria-label={`${suitInfo.label} ${card.rank === 10 ? '장' : card.rank}`}
      tabIndex={isDisabled ? -1 : 0}
    >
      <div className={`card-inner ${!isFaceUp ? 'flipped' : ''}`}>
        {/* Front Face */}
        <div className={`card-face card-front ${suitClass}`} style={{ borderWidth: isSelected ? 2.5 : 2 }}>
          {/* Top-left rank */}
          <div
            className="absolute top-1.5 left-2 font-bold leading-none"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: s.rankSize,
              color: suitInfo.color,
            }}
          >
            {card.rank === 10 ? '장' : card.rank}
          </div>

          {/* Center Hanja */}
          <div
            className="font-black"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: s.hanjaSize,
              color: suitInfo.color,
              textShadow: `0 2px 8px ${suitInfo.color}33`,
            }}
          >
            {suitInfo.hanja}
          </div>

          {/* Suit label */}
          <div
            className="absolute bottom-1.5 text-center w-full opacity-60"
            style={{ fontFamily: 'var(--font-serif)', fontSize: s.fontSize }}
          >
            {suitInfo.label}
          </div>

          {/* Selection indicator — strong visual overlay */}
          {isSelected && (
            <>
              {/* Glow border overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: 'var(--card-radius)',
                  boxShadow: `inset 0 0 0 3px var(--tujeon-gold), 0 0 24px rgba(200,169,110,0.5), 0 0 48px rgba(200,169,110,0.2)`,
                }}
              />
              {/* Gold tint overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: 'var(--card-radius)',
                  background: 'rgba(200, 169, 110, 0.15)',
                }}
              />
              {/* Selection checkmark badge */}
              <div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold z-10"
                style={{
                  background: 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))',
                  color: 'var(--tujeon-black)',
                  boxShadow: '0 2px 8px rgba(200,169,110,0.5)',
                }}
              >
                ✓
              </div>
            </>
          )}
        </div>

        {/* Back Face */}
        <div className="card-face card-back" />
      </div>
    </div>
  );
}
