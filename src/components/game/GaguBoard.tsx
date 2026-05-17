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
    <div className="table-felt min-h-screen flex flex-col items-center justify-between py-6 px-4 relative overflow-hidden">
      <GaguRuleHelper />
      <VictoryEffect 
        type={gamePhase === 'RESULT' ? (winnerId === player.id ? 'VICTORY' : (winnerId === 'DRAW' ? 'DRAW' : 'DEFEAT')) : null}
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
          <span style={{ fontFamily: 'var(--font-serif)' }}>가구 라운드</span>
          <span className="font-bold text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {roundNumber}
          </span>
        </div>
      </div>

      {/* ── Dealer (top) ── */}
      <div className="mt-16 flex flex-col items-center gap-2">
        <div className="text-sm font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
          딜러 {isShowdown && <span className="ml-2 text-white bg-black/40 px-2 py-1 rounded">{getScoreLabel(dealer.score)}</span>}
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
        />
      </div>

      {/* ── Center area (Status & Actions) ── */}
      <div className="flex flex-col items-center gap-6 my-8">
        {/* Phase indicator */}
        <div
          className="text-lg font-bold anim-fade-up"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={gamePhase}
        >
          {gamePhase === 'PLAYER_ACTION' && '카드를 더 받으시겠습니까?'}
          {gamePhase === 'DEALER_ACTION' && '딜러가 카드를 받고 있습니다...'}
          {gamePhase === 'SHOWDOWN' && '패 공개 중...'}
          {gamePhase === 'RESULT' && ''}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
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
      <div className="mb-8 flex flex-col items-center gap-2">
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
        />
        <div className="text-xl font-bold mt-2" style={{ color: 'var(--tujeon-gold)', fontFamily: 'var(--font-serif)' }}>
          현재 점수: <span className="bg-black/40 px-3 py-1 rounded text-white">{getScoreLabel(player.score)}</span>
        </div>
      </div>
    </div>
  );
}
