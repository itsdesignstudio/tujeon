'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO } from '@/types/game';
import CardComponent from '../game/CardComponent';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

/**
 * MultiplayGameBoard — Firebase-synced version of GameBoard (Dolryeo-daegi).
 * Players select 3 cards to form a "house" (집), then reveal the remaining 2.
 */
export default function MultiplayGameBoard() {
  const {
    myId,
    gameState,
    publicPlayers,
    privateHand,
    isHost,
    playCard,
    updateGameState,
  } = useMultiplayStore();

  const phase = gameState?.phase || 'LOBBY';
  const isMyTurn = gameState?.currentTurn === myId;
  const myCards = privateHand as string[];

  const opponents = Object.entries(publicPlayers).filter(([uid]) => uid !== myId);
  const myInfo = myId ? publicPlayers[myId] : null;

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isHwangModalOpen, setIsHwangModalOpen] = useState(false);

  // Parse card IDs into Card objects
  const parsedCards = useMemo(() => {
    return myCards.map((cardId) => {
      const parts = cardId.split('_');
      if (parts.length !== 2) return null;
      const suit = parts[0] as Card['suit'];
      const rank = parseInt(parts[1], 10);
      const suitInfo = SUIT_INFO[suit];
      if (!suitInfo) return null;
      return { id: cardId, suit, rank, imageUrl: '' } as Card;
    }).filter(Boolean) as Card[];
  }, [myCards]);

  // Selection logic
  const selectedSum = useMemo(() => {
    return parsedCards
      .filter((c) => selectedCardIds.includes(c.id))
      .reduce((acc, c) => acc + c.rank, 0);
  }, [parsedCards, selectedCardIds]);

  const canConfirm = selectedCardIds.length === 3 && selectedSum % 10 === 0;

  const toggleSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length < 3) {
        return [...prev, cardId];
      }
      return prev;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || !myId) return;
    // In a full implementation, we'd write the selection to Firebase
    // For now, update gameState to indicate confirmation
    await updateGameState({
      [`confirmed_${myId}`]: selectedCardIds.join(','),
    } as any);
  }, [canConfirm, myId, selectedCardIds, updateGameState]);

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col items-center justify-between py-3 px-3 sm:py-6 sm:px-4 relative overflow-hidden">
      {/* ── Ambient ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)' }}
      />

      {/* ── Phase info bar ── */}
      <div className="absolute top-14 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <div className="glass-panel px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 text-xs sm:text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          <span style={{ fontFamily: 'var(--font-serif)' }}>돌려대기</span>
          <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {phase}
          </span>
        </div>
      </div>

      {/* ── Opponent (top) ── */}
      <div className="mt-20 sm:mt-16">
        {opponents.map(([uid, info]) => (
          <div key={uid} className="flex flex-col items-center gap-1.5">
            <div className="glass-panel px-3 sm:px-5 py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  fontFamily: 'var(--font-serif)',
                  background: 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
                  color: 'var(--tujeon-cream)',
                }}
              >
                상대
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}>
                  {info.name}
                </span>
                <span className="text-[10px] sm:text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
                  카드: {info.cardCount}장
                </span>
              </div>
            </div>
            {/* Dummy card backs */}
            <div className="flex gap-1">
              {Array.from({ length: info.cardCount }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-md"
                  style={{
                    width: 40,
                    height: 60,
                    background: `repeating-conic-gradient(var(--tujeon-red) 0% 25%, var(--tujeon-blue) 25% 50%) 50% / 14px 14px`,
                    border: '2px solid var(--tujeon-gold-dim)',
                    borderRadius: 'var(--card-radius)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Center area ── */}
      <div className="flex flex-col items-center gap-4 sm:gap-6 my-4 sm:my-8">
        <div
          className="text-sm sm:text-lg font-bold anim-fade-up text-center px-4"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={phase}
        >
          {phase === 'MAKE_COMBINATION' && '3장을 골라 집을 지으세요'}
          {phase === 'PLAYER_ACTION' && isMyTurn && '카드를 선택하세요'}
          {phase === 'PLAYER_ACTION' && !isMyTurn && '상대방의 턴입니다...'}
          {phase === 'SHOWDOWN' && '패 공개 중...'}
        </div>

        {/* Selection status */}
        {selectedCardIds.length > 0 && (
          <div
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full"
            style={{
              fontFamily: 'var(--font-serif)',
              background: canConfirm ? 'rgba(127,176,105,0.2)' : 'rgba(200,169,110,0.1)',
              color: canConfirm ? '#7fb069' : 'var(--tujeon-gold)',
              border: `1px solid ${canConfirm ? 'rgba(127,176,105,0.3)' : 'rgba(200,169,110,0.15)'}`,
            }}
          >
            {canConfirm
              ? `✓ 합: ${selectedSum} — 집 짓기 가능!`
              : `선택: ${selectedCardIds.length}/3 · 합: ${selectedSum}`
            }
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full px-4 sm:px-0 sm:w-auto">
          {phase === 'MAKE_COMBINATION' && (
            <>
              <Button onClick={handleConfirm} disabled={!canConfirm} size="lg">
                집 짓기 확인
              </Button>
              <Button onClick={() => setIsHwangModalOpen(true)} variant="secondary" size="lg">
                황 선언
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── My Hand (bottom) ── */}
      <div className="mb-2 sm:mb-4 w-full max-w-lg">
        {myInfo && (
          <div className="glass-panel px-3 sm:px-5 py-2 sm:py-3 flex items-center gap-3 mb-2 justify-center">
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))',
                color: 'var(--tujeon-black)',
              }}
            >
              나
            </div>
            <span className="font-bold text-sm sm:text-base" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}>
              {myInfo.name}
            </span>
          </div>
        )}

        <div className="flex items-end justify-center gap-1 sm:gap-2 flex-wrap">
          {parsedCards.map((card, idx) => (
            <CardComponent
              key={card.id}
              card={card}
              isFaceUp={true}
              isSelected={selectedCardIds.includes(card.id)}
              isDisabled={phase !== 'MAKE_COMBINATION'}
              onClick={() => toggleSelection(card.id)}
              dealDelay={idx * 100}
              size="md"
            />
          ))}
        </div>
      </div>

      {/* Hwang Modal */}
      <Modal isOpen={isHwangModalOpen} onClose={() => setIsHwangModalOpen(false)} title="황 선언">
        <p className="mb-4 sm:mb-6 text-sm sm:text-lg" style={{ color: 'var(--tujeon-cream)' }}>
          정말 10을 만들 조합이 없습니까?<br/>
          <span style={{ color: 'var(--tujeon-red)' }}>황을 선언하면 이번 라운드에서 패배합니다.</span>
        </p>
        <div className="flex gap-3 sm:gap-4 justify-end">
          <Button variant="secondary" onClick={() => setIsHwangModalOpen(false)}>취소</Button>
          <Button onClick={() => { setIsHwangModalOpen(false); }}>선언하기</Button>
        </div>
      </Modal>
    </div>
  );
}
