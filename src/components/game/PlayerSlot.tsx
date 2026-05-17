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
}

export default function PlayerSlot({
  player,
  isCurrentPlayer = false,
  showCards = false,
  isInteractive = false,
  onCardClick,
  position = 'bottom',
}: PlayerSlotProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 ${position === 'top' ? 'flex-col-reverse' : ''}`}
    >
      {/* Player info bar */}
      <div
        className={`glass-panel flex items-center gap-4 px-5 py-3 ${
          isCurrentPlayer ? 'anim-pulse-glow' : ''
        }`}
      >
        {/* Avatar / Indicator */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
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
        <div className="flex flex-col">
          <span
            className="font-bold text-base"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}
          >
            {player.name}
          </span>
          <span className="text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
            {player.isFolded ? '폴드' : player.evaluation ? '준비 완료' : '대기 중'}
          </span>
        </div>

        {/* Score */}
        <div
          className="ml-auto flex flex-col items-end"
        >
          <span
            className="font-bold text-lg tabular-nums"
            style={{ color: 'var(--tujeon-gold-light)' }}
          >
            {player.score.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--tujeon-gold-dim)' }}>
            칩
          </span>
        </div>
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

      {/* Evaluation result (shown during SHOWDOWN/RESULT) */}
      {player.evaluation && showCards && (
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
