'use client';

import React, { useEffect } from 'react';
import { useGaguStore } from '@/logic/useGaguStore';
import PlayerSlot from './PlayerSlot';
import Button from '@/components/ui/Button';
import GaguRuleHelper from './GaguRuleHelper';
import VictoryEffect from '@/components/ui/VictoryEffect';

export default function GaguBoard() {
  const {
    player,
    dealer,
    gamePhase,
    winnerId,
    roundNumber,
    betAmount,
    hit,
    stand,
    nextRound,
    resetGagu,
  } = useGaguStore();

  if (!player || !dealer) {
    return (
      <div className="table-felt min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold anim-fade-up" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
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
    <div className="table-felt min-h-[100dvh] flex flex-col items-center justify-between py-3 px-3 sm:py-6 sm:px-4 relative overflow-hidden">
      <GaguRuleHelper />
      <VictoryEffect 
        type={gamePhase === 'RESULT' ? (winnerId === player.id ? 'VICTORY' : (winnerId === 'DRAW' ? 'DRAW' : 'DEFEAT')) : null}
      />

      {/* ── Ambient decorations ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ── Round / Bet info ── */}
      <div className="absolute top-14 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-6 z-10">
        <div
          className="glass-panel px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 text-xs sm:text-sm"
          style={{ color: 'var(--tujeon-cream-dim)' }}
        >
          <span style={{ fontFamily: 'var(--font-serif)' }}>가구 라운드</span>
          <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {roundNumber}
          </span>
        </div>
      </div>

      {/* ── Dealer (top) ── */}
      <div className="mt-20 sm:mt-16 flex flex-col items-center gap-1.5 sm:gap-2">
        <div className="text-xs sm:text-sm font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
          딜러 {isShowdown && <span className="ml-1.5 sm:ml-2 text-white bg-black/40 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm">{getScoreLabel(dealer.score)}</span>}
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

      {/* ── Center area (Status & Actions) ── */}
      <div className="flex flex-col items-center gap-4 sm:gap-6 my-4 sm:my-8">
        {/* Phase indicator */}
        <div
          className="text-sm sm:text-lg font-bold anim-fade-up text-center px-4"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={gamePhase}
        >
          {gamePhase === 'PLAYER_ACTION' && '카드를 더 받으시겠습니까?'}
          {gamePhase === 'DEALER_ACTION' && '딜러가 카드를 받고 있습니다...'}
          {gamePhase === 'SHOWDOWN' && '패 공개 중...'}
          {gamePhase === 'RESULT' && ''}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full px-4 sm:px-0 sm:w-auto">
          {gamePhase === 'PLAYER_ACTION' && (
            <>
              <Button onClick={hit} disabled={player.cards.length >= 3} size="lg">
                한 장 더 받기 (Hit)
              </Button>
              <Button onClick={stand} variant="secondary" size="lg">
                여기서 멈춤 (Stand)
              </Button>
            </>
          )}

          {gamePhase === 'RESULT' && (
            <>
              <Button onClick={nextRound} size="md">
                다음 라운드 →
              </Button>
              <Button variant="secondary" onClick={resetGagu} size="md">
                메뉴로 돌아가기
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Player (bottom) ── */}
      <div className="mb-4 sm:mb-8 flex flex-col items-center gap-1.5 sm:gap-2">
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
        <div className="text-base sm:text-xl font-bold mt-1 sm:mt-2" style={{ color: 'var(--tujeon-gold)', fontFamily: 'var(--font-serif)' }}>
          현재 점수: <span className="bg-black/40 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-white text-sm sm:text-base">{getScoreLabel(player.score)}</span>
        </div>
      </div>
    </div>
  );
}
