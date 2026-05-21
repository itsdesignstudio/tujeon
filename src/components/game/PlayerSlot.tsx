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
  cardCount?: number;
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
  const showDummyBacks = cardCount !== undefined && player.cards.length === 0 && cardCount > 0;
  const isTop = position === 'top';

  return (
    <div className={`flex flex-col items-center gap-7 ${isTop ? 'flex-col-reverse' : ''}`}>
      {/* ── Player Info Bar (compact) ── */}
      <div
        className={`ink-panel flex items-center gap-2 px-3 py-1.5 ${
          isCurrentPlayer ? 'anim-turn-pulse' : ''
        }`}
      >
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
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
            className="font-bold text-xs truncate leading-tight"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}
          >
            {player.name}
          </span>
          <span className="text-[9px] leading-tight" style={{ color: 'var(--tujeon-cream-dim)' }}>
            {player.isFolded ? '폴드' : player.evaluation ? '완료' : isCurrentPlayer ? '진행 중' : '대기'}
          </span>
        </div>

        {/* Score */}
        {!hideScore && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[9px] opacity-50" style={{ fontFamily: 'var(--font-serif)' }}>💰</span>
            <span
              className="font-bold text-sm tabular-nums"
              style={{ color: 'var(--tujeon-gold-light)' }}
            >
              {player.score.toLocaleString('en-US')}
            </span>
          </div>
        )}
      </div>

      {/* ── Cards ── */}
      {player.cards.length > 0 && (
        <CardHand
          cards={player.cards}
          selectedCardIds={player.selectedCardIds}
          isFaceUp={showCards}
          isInteractive={isInteractive}
          onCardClick={onCardClick}
          size={isTop ? 'sm' : 'md'}
          useFan={!isTop && player.cards.length <= 8}
        />
      )}

      {/* Dummy card backs for multiplayer */}
      {showDummyBacks && (
        <div className="flex gap-0.5">
          {Array.from({ length: cardCount }).map((_, i) => (
            <div
              key={i}
              className="card-back rounded-md"
              style={{
                width: isTop ? 32 : 40,
                height: isTop ? 48 : 60,
                borderWidth: 2,
                transform: 'none',
                backfaceVisibility: 'visible',
                position: 'relative',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Jokbo Badge (inline) ── */}
      {!hideJokbo && player.evaluation && showCards && (
        <div className="anim-result-reveal">
          <div
            className={`jokbo-badge-sm ${getJokboBadgeClass(
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
