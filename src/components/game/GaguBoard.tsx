'use client';

import React, { useEffect, useState } from 'react';
import { useGaguStore } from '@/logic/useGaguStore';
import PlayerSlot from './PlayerSlot';
import Button from '@/components/ui/Button';
import GaguRuleHelper from './GaguRuleHelper';
import VictoryEffect from '@/components/ui/VictoryEffect';
import { useRouter } from 'next/navigation';

export default function GaguBoard() {
  const router = useRouter();
  const {
    player,
    dealer,
    gamePhase,
    winnerId,
    roundNumber,
    hit,
    stand,
    nextRound,
    resetGagu,
  } = useGaguStore();

  const [showRuleHelper, setShowRuleHelper] = useState(false);

  // Auto-start next round after 10 seconds
  useEffect(() => {
    if (gamePhase === 'RESULT') {
      const timer = setTimeout(() => nextRound(), 10000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, nextRound]);

  if (!player || !dealer) {
    return (
      <div className="table-felt min-h-[100dvh] flex items-center justify-center">
        <div className="text-xl font-bold anim-fade-up" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
          가구 준비 중...
        </div>
      </div>
    );
  }

  const getScoreLabel = (score: number) => {
    if (score === 9) return '갑오(9)';
    if (score === 0) return '망(0)';
    return `${score}끗`;
  };

  const isShowdown = gamePhase === 'SHOWDOWN' || gamePhase === 'RESULT';

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col relative overflow-hidden">
      <VictoryEffect
        type={gamePhase === 'RESULT' ? (winnerId === player.id ? 'VICTORY' : (winnerId === 'DRAW' ? 'DRAW' : 'DEFEAT')) : null}
      />

      {/* ── Status Bar ── */}
      <div className="status-bar">
        <button onClick={() => { resetGagu(); router.push('/'); }} className="status-bar-back" aria-label="홈으로">←</button>
        <div className="status-bar-item">
          <span style={{ fontFamily: 'var(--font-serif)' }}>가구</span>
          <span className="status-bar-value">R{roundNumber}</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowRuleHelper(true)}
          className="status-bar-back"
          aria-label="규칙 도우미"
          style={{ fontSize: '0.9rem' }}
        >
          ?
        </button>
      </div>

      {/* ── Dealer Area (top) ── */}
      <div className="pt-[calc(44px+env(safe-area-inset-top)+12px)] px-3 sm:px-6 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
            딜러
          </span>
          {isShowdown && (
            <span className="ink-panel px-2 py-0.5 text-xs font-bold" style={{ color: 'var(--tujeon-cream)' }}>
              {getScoreLabel(dealer.score)}
            </span>
          )}
        </div>
        <PlayerSlot
          player={{
            ...dealer,
            name: '딜러',
            isBot: true,
            selectedCardIds: [],
            isFolded: false,
            evaluation: null,
          }}
          showCards={isShowdown}
          isInteractive={false}
          position="top"
          hideScore={true}
        />
      </div>

      {/* ── Center Area ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 min-h-[120px]">
        <div
          className="text-sm sm:text-base font-bold text-center anim-phase-in"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={gamePhase}
        >
          {gamePhase === 'PLAYER_ACTION' && '카드를 더 받으시겠습니까?'}
          {gamePhase === 'DEALER_ACTION' && '딜러가 카드를 받고 있습니다...'}
          {gamePhase === 'SHOWDOWN' && '패 공개 중...'}
        </div>
      </div>

      {/* ── Player Area (bottom) ── */}
      <div className="px-3 sm:px-6 pb-3 relative z-10 flex flex-col items-center gap-1.5">
        <PlayerSlot
          player={{
            ...player,
            name: '나',
            isBot: false,
            selectedCardIds: [],
            isFolded: false,
            evaluation: null,
          }}
          showCards={true}
          isInteractive={false}
          position="bottom"
          hideScore={true}
        />
        {/* Score display */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}>
            현재 점수
          </span>
          <span
            className="ink-panel px-3 py-1 text-base font-bold"
            style={{ color: 'var(--tujeon-gold-light)', fontFamily: 'var(--font-serif)' }}
          >
            {getScoreLabel(player.score)}
          </span>
          {player.cards.length < 3 && gamePhase === 'PLAYER_ACTION' && (
            <span className="text-[9px] opacity-40">({player.cards.length}/3장)</span>
          )}
        </div>
      </div>

      {/* ── Action Dock ── */}
      {(gamePhase === 'PLAYER_ACTION' || gamePhase === 'DEALER_ACTION' || gamePhase === 'SHOWDOWN') && (
        <div className="action-dock">
          <Button
            onClick={hit}
            disabled={gamePhase === 'DEALER_ACTION' || gamePhase === 'SHOWDOWN' || player.cards.length >= 3}
            size="md"
            className="flex-1 max-w-[180px]"
          >
            {gamePhase === 'SHOWDOWN'
              ? '패 공개 중...'
              : gamePhase === 'DEALER_ACTION'
              ? '딜러 차례...'
              : '한 장 더 받기'}
          </Button>
          <Button
            onClick={stand}
            disabled={gamePhase === 'DEALER_ACTION' || gamePhase === 'SHOWDOWN'}
            variant="secondary"
            size="md"
            className="flex-1 max-w-[140px]"
          >
            멈추기
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

      {/* ── Rule Helper ── */}
      <GaguRuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
