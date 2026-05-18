'use client';

import React from 'react';
import { Player } from '@/types/game';
import CardHand from './CardHand';

interface PlayerSlotProps {
  player: Player;
  isCurrentPlayer?: boolean;
  showCards?: boolean;
  isInteractive?: boolean;
  onCardClick?: (cardId: string) => void;
  position?: 'top' | 'bottom';
  hideScore?: boolean;
  hideJokbo?: boolean;
  /** Multiplay mode: show only card backs based on count */
  cardCount?: number;
}

export default function PlayerSlot({
  player,
  isCurrentPlayer = false,
  showCards = false,
  isInteractive = false,
  onCardClick,
  position = 'bottom',
  hideScore = false,
  hideJokbo = false,
  cardCount,
}: PlayerSlotProps) {
  // In multiplay, if we have no card data but know cardCount, show dummy backs
  const showDummyBacks = cardCount !== undefined && player.cards.length === 0 && cardCount > 0;

  return (
    <div
      className={`flex flex-col items-center gap-2 sm:gap-3 ${position === 'top' ? 'flex-col-reverse' : ''}`}
    >
      {/* Player info bar */}
      <div
        className={`glass-panel flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3 ${
          isCurrentPlayer ? 'anim-pulse-glow' : ''
        }`}
      >
        {/* Avatar / Indicator */}
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold shrink-0"
          style={{
            fontFamily: 'var(--font-serif)',
            background: player.isBot
              ? 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))'
              : 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))',
            color: player.isBot ? 'var(--tujeon-cream)' : 'var(--tujeon-black)',
          }}
        >
          {player.isBot ? '봇' : '나'}
        </div>

        {/* Name + Status */}
        <div className="flex flex-col min-w-0">
          <span
            className="font-bold text-sm sm:text-base truncate"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}
          >
            {player.name}
          </span>
          <span className="text-[10px] sm:text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
            {player.isFolded ? '폴드' : player.evaluation ? '준비 완료' : '대기 중'}
          </span>
        </div>

        {/* Score */}
        {!hideScore && (
          <div
            className="ml-auto flex flex-col items-end"
          >
            <span
              className="font-bold text-base sm:text-lg tabular-nums"
              style={{ color: 'var(--tujeon-gold-light)' }}
            >
              {player.score.toLocaleString()}
            </span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--tujeon-gold-dim)' }}>
              칩
            </span>
          </div>
        )}
      </div>

      {/* Cards */}
      {player.cards.length > 0 && (
        <CardHand
          cards={player.cards}
          selectedCardIds={player.selectedCardIds}
          isFaceUp={showCards}
          isInteractive={isInteractive}
          onCardClick={onCardClick}
          size={position === 'top' ? 'sm' : 'md'}
        />
      )}

      {/* Dummy card backs for multiplay (no card data, but known count) */}
      {showDummyBacks && (
        <div className="flex gap-1">
          {Array.from({ length: cardCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-md"
              style={{
                width: position === 'top' ? 40 : 48,
                height: position === 'top' ? 60 : 72,
                background: `repeating-conic-gradient(var(--tujeon-red) 0% 25%, var(--tujeon-blue) 25% 50%) 50% / 14px 14px`,
                border: '2px solid var(--tujeon-gold-dim)',
                borderRadius: 'var(--card-radius)',
                boxShadow: 'var(--shadow-card)',
              }}
            />
          ))}
        </div>
      )}

      {/* Evaluation result (shown during SHOWDOWN/RESULT) */}
      {!hideJokbo && player.evaluation && showCards && (
        <div className="anim-scale-in">
          <div
            className={`jokbo-badge ${getJokboBadgeClass(
              player.evaluation.isHwang ? 'hwang' : player.evaluation.jokboType
            )}`}
          >
            {player.evaluation.jokboLabel}
          </div>
        </div>
      )}
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
