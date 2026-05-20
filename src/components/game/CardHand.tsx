'use client';

import React, { useMemo } from 'react';
import { Card } from '@/types/game';
import CardComponent from './CardComponent';

interface CardHandProps {
  cards: Card[];
  selectedCardIds: string[];
  isFaceUp?: boolean;
  isInteractive?: boolean;
  onCardClick?: (cardId: string) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function CardHand({
  cards,
  selectedCardIds,
  isFaceUp = true,
  isInteractive = true,
  onCardClick,
  size = 'md',
}: CardHandProps) {
  // Calculate the sum of selected cards
  const selectedSum = useMemo(() => {
    return cards
      .filter((c) => selectedCardIds.includes(c.id))
      .reduce((acc, c) => acc + c.rank, 0);
  }, [cards, selectedCardIds]);

  const isValidCombination = selectedCardIds.length === 3 && selectedSum % 10 === 0;
  const hasThreeSelected = selectedCardIds.length === 3;

  // Use overlap layout when there are many cards
  const useOverlap = cards.length > 5;

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 w-full">
      {/* Cards — scroll container ensures no clipping on small screens */}
      <div className="card-hand-scroll w-full">
        <div className={useOverlap ? 'card-hand-overlap mx-auto' : 'flex items-end gap-1 sm:gap-2 mx-auto px-2 sm:px-4'}>
          {cards.map((card, idx) => (
            <CardComponent
              key={card.id}
              card={card}
              isFaceUp={isFaceUp}
              isSelected={selectedCardIds.includes(card.id)}
              isDisabled={!isInteractive}
              onClick={() => onCardClick?.(card.id)}
              dealDelay={idx * (useOverlap ? 30 : 100)}
              size={size}
            />
          ))}
        </div>
      </div>

      {/* Selection status indicator (only for interactive hands) */}
      {isInteractive && isFaceUp && selectedCardIds.length > 0 && (
        <div
          className="anim-fade-up text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5 rounded-full"
          style={{
            fontFamily: 'var(--font-serif)',
            background: isValidCombination
              ? 'rgba(127, 176, 105, 0.2)'
              : hasThreeSelected
              ? 'rgba(179, 58, 58, 0.2)'
              : 'rgba(200, 169, 110, 0.1)',
            color: isValidCombination
              ? '#7fb069'
              : hasThreeSelected
              ? 'var(--tujeon-red-light)'
              : 'var(--tujeon-gold)',
            border: `1px solid ${
              isValidCombination
                ? 'rgba(127, 176, 105, 0.3)'
                : hasThreeSelected
                ? 'rgba(179, 58, 58, 0.3)'
                : 'rgba(200, 169, 110, 0.15)'
            }`,
          }}
        >
          {isValidCombination ? (
            <>✓ 합: {selectedSum} — 집 짓기 가능!</>
          ) : (
            <>
              선택: {selectedCardIds.length}/3 · 합: {selectedSum}
              {hasThreeSelected && ' — 10의 배수가 아닙니다'}
            </>
          )}
        </div>
      )}
    </div>
  );
}
