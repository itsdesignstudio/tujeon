'use client';

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useGameStore } from '@/logic/useGameStore';
import PlayerSlot from './PlayerSlot';
import JokboDisplay from './JokboDisplay';
import Button from '@/components/ui/Button';
import RuleHelper from './RuleHelper';
import Modal from '@/components/ui/Modal';
import VictoryEffect from '@/components/ui/VictoryEffect';

export default function GameBoard() {
  const {
    players,
    gamePhase,
    winnerId,
    roundNumber,
    betAmount,
    toggleCardSelection,
    confirmCombination,
    declareHwang,
    evaluateHands,
    nextRound,
    resetGame,
  } = useGameStore();

  const humanPlayer = players.find((p) => !p.isBot);
  const botPlayer = players.find((p) => p.isBot);

  const [isHwangModalOpen, setIsHwangModalOpen] = useState(false);

  // Validate human's selection
  const selectedSum = useMemo(() => {
    if (!humanPlayer) return 0;
    return humanPlayer.cards
      .filter((c) => humanPlayer.selectedCardIds.includes(c.id))
      .reduce((acc, c) => acc + c.rank, 0);
  }, [humanPlayer]);

  const canConfirm =
    humanPlayer &&
    humanPlayer.selectedCardIds.length === 3 &&
    selectedSum % 10 === 0;

  // Auto-transition: SHOWDOWN → RESULT after a delay
  useEffect(() => {
    if (gamePhase === 'SHOWDOWN') {
      const timer = setTimeout(() => {
        evaluateHands();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, evaluateHands]);

  const handleConfirm = useCallback(() => {
    if (humanPlayer && canConfirm) {
      confirmCombination(humanPlayer.id);
    }
  }, [humanPlayer, canConfirm, confirmCombination]);

  const handleHwang = useCallback(() => {
    if (humanPlayer) {
      setIsHwangModalOpen(true);
    }
  }, [humanPlayer]);

  const confirmHwang = useCallback(() => {
    if (humanPlayer) {
      declareHwang(humanPlayer.id);
      setIsHwangModalOpen(false);
    }
  }, [humanPlayer, declareHwang]);

  const cancelHwang = useCallback(() => {
    setIsHwangModalOpen(false);
  }, []);

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (humanPlayer && gamePhase === 'MAKE_COMBINATION') {
        toggleCardSelection(humanPlayer.id, cardId);
      }
    },
    [humanPlayer, gamePhase, toggleCardSelection]
  );

  return (
    <div className="table-felt min-h-screen flex flex-col items-center justify-between py-6 px-4 relative overflow-hidden">
      <RuleHelper />
      <VictoryEffect 
        type={gamePhase === 'RESULT' ? (winnerId === humanPlayer?.id ? 'VICTORY' : (winnerId === 'DRAW' ? 'DRAW' : 'DEFEAT')) : null}
      />

      {/* ── Ambient decorations ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ── Round / Bet info ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10">
        <div
          className="glass-panel px-4 py-2 flex items-center gap-2 text-sm"
          style={{ color: 'var(--tujeon-cream-dim)' }}
        >
          <span style={{ fontFamily: 'var(--font-serif)' }}>라운드</span>
          <span className="font-bold text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {roundNumber}
          </span>
        </div>
        <div
          className="glass-panel px-4 py-2 flex items-center gap-2 text-sm"
          style={{ color: 'var(--tujeon-cream-dim)' }}
        >
          <span style={{ fontFamily: 'var(--font-serif)' }}>판돈</span>
          <span className="font-bold text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {betAmount * players.length}
          </span>
        </div>
      </div>

      {/* ── Opponent (top) ── */}
      {botPlayer && (
        <div className="mt-16">
          <PlayerSlot
            player={botPlayer}
            showCards={gamePhase === 'SHOWDOWN' || gamePhase === 'RESULT'}
            isInteractive={false}
            position="top"
          />
        </div>
      )}

      {/* ── Center area ── */}
      <div className="flex flex-col items-center gap-6 my-8">
        {/* Phase indicator */}
        <div
          className="text-lg font-bold anim-fade-up"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={gamePhase}
        >
          {gamePhase === 'MAKE_COMBINATION' && '3장을 골라 집을 지으세요'}
          {gamePhase === 'SHOWDOWN' && '패 공개 중...'}
          {gamePhase === 'RESULT' && ''}
        </div>

        {/* Showdown result */}
        {gamePhase === 'RESULT' && (
          <JokboDisplay players={players} winnerId={winnerId} />
        )}

        {/* Deck visual (center) */}
        {gamePhase === 'MAKE_COMBINATION' && (
          <div className="flex items-center gap-3">
            {/* Stack of cards representing the deck */}
            <div className="relative w-16 h-24">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-md"
                  style={{
                    width: 60,
                    height: 90,
                    top: i * 2,
                    left: i * 2,
                    background: 'linear-gradient(135deg, var(--tujeon-red) 0%, #6b1a1a 100%)',
                    border: '2px solid var(--tujeon-gold-dim)',
                    borderRadius: 'var(--card-radius)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4">
          {gamePhase === 'MAKE_COMBINATION' && (
            <>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm}
                size="lg"
              >
                집 짓기 확인
              </Button>
              <Button
                onClick={handleHwang}
                variant="secondary"
                size="lg"
              >
                황 선언
              </Button>
            </>
          )}

          {gamePhase === 'RESULT' && (
            <>
              <Button onClick={nextRound} size="md">
                다음 라운드 →
              </Button>
              <Button variant="secondary" onClick={resetGame} size="md">
                메뉴로 돌아가기
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Human player (bottom) ── */}
      {humanPlayer && (
        <div className="mb-4">
          <PlayerSlot
            player={humanPlayer}
            isCurrentPlayer={gamePhase === 'MAKE_COMBINATION'}
            showCards={true}
            isInteractive={gamePhase === 'MAKE_COMBINATION'}
            onCardClick={handleCardClick}
            position="bottom"
          />
        </div>
      )}

      {/* Hwang Declaration Modal */}
      <Modal isOpen={isHwangModalOpen} onClose={cancelHwang} title="황 선언">
        <p className="mb-6 text-lg" style={{ color: 'var(--tujeon-cream)' }}>
          정말 10을 만들 조합이 없습니까?<br/>
          <span style={{ color: 'var(--tujeon-red)' }}>황을 선언하면 이번 라운드에서 패배합니다.</span>
        </p>
        <div className="flex gap-4 justify-end">
          <Button variant="secondary" onClick={cancelHwang}>취소</Button>
          <Button onClick={confirmHwang}>선언하기</Button>
        </div>
      </Modal>
    </div>
  );
}
