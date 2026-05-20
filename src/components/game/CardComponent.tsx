'use client';

import React from 'react';
import { Card, SUIT_INFO } from '@/types/game';

interface CardComponentProps {
  card: Card;
  isFaceUp?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  dealDelay?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  selectionIndex?: number;
}

const RANK_DISPLAY: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九', 10: '장',
};

const SUIT_BG_TINT: Record<string, string> = {
  PERSON:   'rgba(200, 169, 110, 0.06)',
  FISH:     'rgba(91, 143, 185, 0.06)',
  BIRD:     'rgba(127, 176, 105, 0.06)',
  PHEASANT: 'rgba(184, 92, 92, 0.06)',
  STAR:     'rgba(212, 160, 23, 0.06)',
  HORSE:    'rgba(139, 105, 20, 0.06)',
  DEER:     'rgba(184, 149, 106, 0.06)',
  RABBIT:   'rgba(207, 138, 158, 0.06)',
};

export default function CardComponent({
  card,
  isFaceUp = true,
  isSelected = false,
  isDisabled = false,
  onClick,
  dealDelay = 0,
  size = 'md',
  selectionIndex,
}: CardComponentProps) {
  const suitInfo = SUIT_INFO[card.suit];
  const suitClass = `suit-${card.suit.toLowerCase()}`;
  const isJang = card.rank === 10;

  const sizeStyles = {
    xs: { width: 36, height: 54, rankSize: '0.75rem', hanjaSize: '1.20rem', labelSize: '0.5rem', cornerPad: '2px 3px', borderRadius: '4px' },
    sm: { width: 52, height: 78, rankSize: '1.0rem', hanjaSize: '1.60rem', labelSize: '0.7rem', cornerPad: '3px 4px', borderRadius: '6px' },
    md: { width: 68, height: 102, rankSize: '1.3rem', hanjaSize: '2.20rem', labelSize: '0.85rem', cornerPad: '4px 5px', borderRadius: '8px' },
    lg: { width: 88, height: 132, rankSize: '1.6rem', hanjaSize: '2.80rem', labelSize: '1.0rem', cornerPad: '5px 6px', borderRadius: '10px' },
  };

  const s = sizeStyles[size];
  const rankLabel = isJang ? '장' : String(card.rank);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`card-base anim-deal ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      style={{
        width: s.width,
        height: s.height,
        borderRadius: s.borderRadius,
        animationDelay: `${dealDelay}ms`,
      }}
      onClick={!isDisabled ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role="button"
      aria-label={`${suitInfo.label} ${rankLabel}`}
      tabIndex={isDisabled ? -1 : 0}
    >
      <div className={`card-inner ${!isFaceUp ? 'flipped' : ''}`}>
        {/* ── Front Face ── */}
        <div
          className={`card-face card-front ${suitClass} ${isJang ? 'card-jang' : ''}`}
          style={{
            borderWidth: isSelected ? 2.5 : undefined,
            background: `linear-gradient(155deg, #f8ecd4 0%, #ecdbb8 40%, #e4ceaa 100%), ${SUIT_BG_TINT[card.suit] || ''}`,
          }}
        >
          {/* Top-left corner: rank */}
          <div
            className="absolute flex flex-col items-center leading-none"
            style={{
              top: s.cornerPad.split(' ')[0],
              left: s.cornerPad.split(' ')[1],
              fontFamily: 'var(--font-serif)',
              fontSize: s.rankSize,
              fontWeight: 700,
              color: suitInfo.color,
            }}
          >
            <span>{rankLabel}</span>
          </div>

          {/* Center: Hanja character */}
          <div
            className="font-black select-none"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: s.hanjaSize,
              color: suitInfo.color,
              textShadow: `0 2px 10px ${suitInfo.color}30`,
              lineHeight: 1,
            }}
          >
            {suitInfo.hanja}
          </div>



          {/* Suit label at bottom center */}
          {size !== 'xs' && (
            <div
              className="absolute w-full text-center opacity-80 font-bold"
              style={{
                bottom: size === 'sm' ? 2 : 4,
                fontFamily: 'var(--font-serif)',
                fontSize: s.labelSize,
              }}
            >
              {suitInfo.label}
            </div>
          )}

          {/* ── Selection overlay ── */}
          {isSelected && (
            <>
              {/* Glow ring */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: 'inherit',
                  boxShadow: `inset 0 0 0 3px var(--tujeon-gold), 0 0 28px rgba(200,169,110,0.5)`,
                }}
              />
              {/* Gold tint */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: 'inherit',
                  background: 'rgba(200, 169, 110, 0.12)',
                }}
              />
              {/* Selection badge */}
              <div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold z-10"
                style={{
                  background: 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))',
                  color: 'var(--tujeon-black)',
                  boxShadow: '0 2px 8px rgba(200,169,110,0.5)',
                }}
              >
                {selectionIndex ?? '✓'}
              </div>
              {/* Bottom light ray */}
              <div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  bottom: -6,
                  width: '60%',
                  height: 8,
                  background: 'radial-gradient(ellipse, rgba(200,169,110,0.5) 0%, transparent 70%)',
                  borderRadius: '50%',
                }}
              />
            </>
          )}
        </div>

        {/* ── Back Face ── */}
        <div className="card-face card-back" />
      </div>
    </div>
  );
}
