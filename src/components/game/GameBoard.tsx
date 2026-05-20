'use client';

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useGameStore } from '@/logic/useGameStore';
import PlayerSlot from './PlayerSlot';
import JokboDisplay from './JokboDisplay';
import Button from '@/components/ui/Button';
import RuleHelper from './RuleHelper';
import Modal from '@/components/ui/Modal';
import VictoryEffect from '@/components/ui/VictoryEffect';
import { useRouter } from 'next/navigation';

export default function GameBoard() {
  const router = useRouter();
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
  const [showRuleHelper, setShowRuleHelper] = useState(false);

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

  // Auto-transition: SHOWDOWN → RESULT
  useEffect(() => {
    if (gamePhase === 'SHOWDOWN') {
      const timer = setTimeout(() => evaluateHands(), 2000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, evaluateHands]);

  // Auto-start next round after 10 seconds in RESULT
  useEffect(() => {
    if (gamePhase === 'RESULT') {
      const timer = setTimeout(() => nextRound(), 10000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, nextRound]);

  const handleConfirm = useCallback(() => {
    if (humanPlayer && canConfirm) confirmCombination(humanPlayer.id);
  }, [humanPlayer, canConfirm, confirmCombination]);

  const handleHwang = useCallback(() => {
    if (humanPlayer) setIsHwangModalOpen(true);
  }, [humanPlayer]);

  const confirmHwang = useCallback(() => {
    if (humanPlayer) {
      declareHwang(humanPlayer.id);
      setIsHwangModalOpen(false);
    }
  }, [humanPlayer, declareHwang]);

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (humanPlayer && gamePhase === 'MAKE_COMBINATION') {
        toggleCardSelection(humanPlayer.id, cardId);
      }
    },
    [humanPlayer, gamePhase, toggleCardSelection]
  );

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col relative overflow-hidden">
      {/* ── Victory Effect Overlay ── */}
      <VictoryEffect
        type={
          gamePhase === 'RESULT'
            ? winnerId === humanPlayer?.id
              ? 'VICTORY'
              : winnerId === 'DRAW'
              ? 'DRAW'
              : 'DEFEAT'
            : null
        }
      />

      {/* ══════════════════════════════════════════════
          STATUS BAR — Top fixed
          ══════════════════════════════════════════════ */}
      <div className="status-bar">
        <button
          onClick={() => {
            resetGame();
            router.push('/');
          }}
          className="status-bar-back"
          aria-label="홈으로"
        >
          ←
        </button>

        <div className="status-bar-item">
          <span style={{ fontFamily: 'var(--font-serif)' }}>라운드</span>
          <span className="status-bar-value">{roundNumber}</span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        <div className="status-bar-item">
          <span style={{ fontFamily: 'var(--font-serif)' }}>판돈</span>
          <span className="status-bar-value">{betAmount * players.length}</span>
        </div>

        <div className="flex-1" />

        {humanPlayer && (
          <div className="status-bar-item">
            <span style={{ fontFamily: 'var(--font-serif)' }}>💰</span>
            <span className="status-bar-value">{humanPlayer.score.toLocaleString('en-US')}</span>
          </div>
        )}

        <button
          onClick={() => setShowRuleHelper(true)}
          className="status-bar-back"
          aria-label="규칙 도우미"
          style={{ fontSize: '0.9rem' }}
        >
          ?
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          OPPONENT AREA — Top (compact)
          ══════════════════════════════════════════════ */}
      {botPlayer && (
        <div className="pt-[calc(44px+env(safe-area-inset-top)+12px)] px-3 sm:px-6">
          <PlayerSlot
            player={botPlayer}
            showCards={gamePhase === 'SHOWDOWN' || gamePhase === 'RESULT'}
            isInteractive={false}
            position="top"
            hideJokbo={gamePhase === 'RESULT'}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CENTER TABLE AREA
          ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 min-h-[140px]">
        {/* Phase message */}
        <div
          className="text-sm sm:text-base font-bold text-center anim-phase-in"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={gamePhase}
        >
          {gamePhase === 'DEAL' && '카드 배분 중...'}
          {gamePhase === 'MAKE_COMBINATION' && '3장을 골라 집을 지으세요'}
          {gamePhase === 'SHOWDOWN' && '패 공개 중...'}
        </div>

        {/* Deck visual */}
        {gamePhase === 'MAKE_COMBINATION' && (
          <div className="flex items-center gap-3 anim-fade-up">
            <div className="relative" style={{ width: 44, height: 66 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-md"
                  style={{
                    width: 40,
                    height: 60,
                    top: i * 2,
                    left: i * 2,
                    background: 'linear-gradient(135deg, #4a1520 0%, #1a2a4a 100%)',
                    border: '2px solid var(--tujeon-gold-dim)',
                    borderRadius: 'var(--card-radius)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Result display */}
        {gamePhase === 'RESULT' && (
          <JokboDisplay players={players} winnerId={winnerId} />
        )}
      </div>

      {/* ══════════════════════════════════════════════
          MY HAND AREA — Bottom
          ══════════════════════════════════════════════ */}
      {humanPlayer && (
        <div className="px-3 sm:px-6 pb-3">
          <PlayerSlot
            player={humanPlayer}
            isCurrentPlayer={gamePhase === 'MAKE_COMBINATION'}
            showCards={true}
            isInteractive={gamePhase === 'MAKE_COMBINATION'}
            onCardClick={handleCardClick}
            position="bottom"
            hideJokbo={gamePhase === 'RESULT'}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ACTION DOCK — Bottom fixed
          ══════════════════════════════════════════════ */}
      {(gamePhase === 'MAKE_COMBINATION' || gamePhase === 'SHOWDOWN') && (
        <div className="action-dock">
          <Button
            onClick={handleConfirm}
            disabled={gamePhase === 'SHOWDOWN' || !canConfirm}
            size="md"
            className="flex-1 max-w-[200px]"
          >
            {gamePhase === 'SHOWDOWN' ? '패 공개 중...' : '집 짓기 확인'}
          </Button>
          <Button
            onClick={handleHwang}
            disabled={gamePhase === 'SHOWDOWN'}
            variant="danger"
            size="md"
            className="max-w-[140px]"
          >
            황 선언
          </Button>
        </div>
      )}

      {gamePhase === 'RESULT' && (
        <div className="action-dock">
          <Button onClick={nextRound} size="md" className="flex-1 max-w-[220px]">
            다음 라운드
          </Button>
        </div>
      )}

      {/* Spacer for action dock - stable and permanent */}
      <div style={{ height: 'calc(52px + env(safe-area-inset-bottom))' }} />

      {/* ── Hwang Modal ── */}
      <Modal isOpen={isHwangModalOpen} onClose={() => setIsHwangModalOpen(false)} title="황 선언" bottomSheet>
        <p className="mb-5 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
          정말 10의 배수를 만들 수 있는 조합이 없습니까?<br />
          <span style={{ color: 'var(--tujeon-red-light)' }}>황을 선언하면 이번 라운드에서 패배합니다.</span>
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setIsHwangModalOpen(false)}>취소</Button>
          <Button variant="danger" onClick={confirmHwang}>선언하기</Button>
        </div>
      </Modal>

      {/* ── Rule Helper (Bottom Sheet) ── */}
      <RuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
