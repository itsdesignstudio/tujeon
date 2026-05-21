'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useGaguStore } from '@/logic/useGaguStore';
import { useGameStore } from '@/logic/useGameStore';
import PlayerSlot from './PlayerSlot';
import Button from '@/components/ui/Button';
import GaguRuleHelper from './GaguRuleHelper';
import VictoryEffect from '@/components/ui/VictoryEffect';
import { useRouter } from 'next/navigation';
import { gameAudio } from '@/lib/audio';

export default function GaguBoard() {
  const router = useRouter();
  const timeLeft = useGameStore((s) => s.timeLeft);
  const {
    player,
    dealer,
    gamePhase,
    winnerId,
    roundNumber,
    betAmount,
    currentRoundBet,
    hit,
    stand,
    nextRound,
    resetGagu,
    setBetAmount,
    restartGagu,
  } = useGaguStore();

  const [showRuleHelper, setShowRuleHelper] = useState(false);

  const isGameOver = useMemo(() => {
    return player !== null && dealer !== null && (player.chips <= 0 || dealer.chips <= 0);
  }, [player, dealer]);

  const [hasPlayedGameOverSound, setHasPlayedGameOverSound] = useState(false);
  useEffect(() => {
    if (isGameOver && !hasPlayedGameOverSound) {
      const humanWon = dealer && dealer.chips <= 0;
      if (humanWon) {
        gameAudio.playVictory();
      } else {
        gameAudio.playDefeat();
      }
      setHasPlayedGameOverSound(true);
    } else if (!isGameOver) {
      setHasPlayedGameOverSound(false);
    }
  }, [isGameOver, hasPlayedGameOverSound, dealer]);

  const handleBetAmountChange = useCallback(() => {
    if (isGameOver) return;
    const nextAmount = betAmount === 100 ? 150 : betAmount === 150 ? 200 : 100;
    setBetAmount(nextAmount);
    gameAudio.playCardSelect();
  }, [betAmount, isGameOver, setBetAmount]);

  // Mute preference state tracking
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    setIsMuted(gameAudio.getMuted());
  }, []);

  const toggleMute = useCallback(() => {
    const nextMute = gameAudio.toggleMute();
    setIsMuted(nextMute);
  }, []);



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
      <div className="status-bar relative flex items-center justify-between">
        {/* Left: Back Button */}
        <button
          onClick={() => {
            resetGagu();
            router.push('/');
          }}
          className="status-bar-back"
          aria-label="홈으로"
        >
          ←
        </button>

        {/* Center: Info Badge (라운드 / 판돈) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 bg-white/5 px-3 py-1 rounded-full border border-white/10 shadow-md">
          <div className="status-bar-item gap-1">
            <span style={{ fontFamily: 'var(--font-serif)' }}>라운드</span>
            <span className="status-bar-value">{roundNumber}</span>
          </div>

          <div className="w-px h-3 bg-white/10" />

          {/* Clickable Bet Amount Selector */}
          <button
            onClick={handleBetAmountChange}
            disabled={isGameOver}
            className={`status-bar-item gap-1 px-1.5 py-0.5 rounded transition-all duration-200 ${
              !isGameOver
                ? 'hover:bg-white/10 active:scale-95 cursor-pointer text-yellow-400'
                : 'opacity-70 cursor-not-allowed text-white/80'
            }`}
            title={!isGameOver ? "판돈 설정 클릭 (100 -> 150 -> 200)" : undefined}
          >
            <span style={{ fontFamily: 'var(--font-serif)' }}>판돈</span>
            <span className={`status-bar-value ${!isGameOver ? 'font-black' : 'font-medium'}`}>
              {(gamePhase === 'INIT' || gamePhase === 'RESULT' ? betAmount : currentRoundBet) * 2}
            </span>
            {gamePhase !== 'INIT' && gamePhase !== 'RESULT' && betAmount !== currentRoundBet && (
              <span className="text-[9px] text-white/40 font-normal ml-0.5" style={{ fontFamily: 'sans-serif' }}>
                (다음 적용)
              </span>
            )}
          </button>
        </div>

        {/* Right Action Icons & Score */}
        <div className="flex items-center gap-2">
          {player && (
            <div className="status-bar-item mr-1">
              <span style={{ fontFamily: 'var(--font-serif)' }}>💰</span>
              <span className="status-bar-value">{player.chips.toLocaleString('en-US')}</span>
            </div>
          )}

          <button
            onClick={toggleMute}
            className="status-bar-back"
            aria-label={isMuted ? "소리 켜기" : "소리 끄기"}
            style={{ fontSize: '0.9rem' }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={() => setShowRuleHelper(true)}
            className="status-bar-back"
            aria-label="규칙 도우미"
            style={{ fontSize: '0.9rem' }}
          >
            ?
          </button>
        </div>
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
            score: dealer.chips,
            selectedCardIds: [],
            isFolded: false,
            evaluation: null,
          }}
          showCards={isShowdown}
          isInteractive={false}
          position="top"
          hideScore={false}
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

        {/* Timer countdown badge */}
        {gamePhase === 'PLAYER_ACTION' && timeLeft !== null && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold shadow-lg transition-all duration-300 ${
              timeLeft <= 3
                ? 'bg-red-950/80 border-red-500 text-red-500 scale-110 animate-pulse shadow-red-900/50'
                : 'bg-black/60 border-yellow-600/30 text-yellow-500'
            }`}
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            <span className={timeLeft <= 3 ? 'animate-bounce' : ''}>⏳</span>
            <span>{timeLeft}초 남음</span>
          </div>
        )}
      </div>

      {/* ── Player Area (bottom) ── */}
      <div className="px-3 sm:px-6 pb-3 relative z-10 flex flex-col items-center gap-1.5">
        <PlayerSlot
          player={{
            ...player,
            name: '나',
            isBot: false,
            score: player.chips,
            selectedCardIds: [],
            isFolded: false,
            evaluation: null,
          }}
          showCards={true}
          isInteractive={false}
          position="bottom"
          hideScore={false}
        />
        {/* Score and Bet display */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
          <span className="text-xs" style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}>
            현재 점수
          </span>
          <span
            className="ink-panel px-2.5 py-0.5 text-sm font-bold"
            style={{ color: 'var(--tujeon-gold-light)', fontFamily: 'var(--font-serif)' }}
          >
            {getScoreLabel(player.score)}
          </span>

          <span className="text-xs ml-1" style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}>
            이번 판 베팅
          </span>
          <span
            className="ink-panel px-2.5 py-0.5 text-sm font-bold text-yellow-400"
            style={{ fontFamily: 'var(--font-serif)', background: 'rgba(200, 169, 110, 0.05)' }}
          >
            {currentRoundBet} 냥
          </span>

          {player.cards.length < 3 && gamePhase === 'PLAYER_ACTION' && (
            <span className="text-[9px] opacity-40 ml-1">({player.cards.length}/3장)</span>
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
      <div style={{ height: 'calc(68px + env(safe-area-inset-bottom))' }} />

      {/* ── Bankruptcy ("격파!") Fullscreen Overlay ── */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 anim-fade-in">
          <div 
            className="w-full max-w-md bg-[#181214] border-2 border-yellow-600/50 rounded-xl p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
            style={{ boxShadow: '0 0 30px rgba(184, 92, 92, 0.2)' }}
          >
            {/* Background texture hints */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tujeon-gold)_1px,_transparent_1px)] bg-[length:16px_16px]" />
            
            {/* Dramatic title */}
            <h2 
              className="text-4xl sm:text-5xl font-black tracking-widest mb-2 select-none animate-pulse"
              style={{
                fontFamily: 'var(--font-serif)',
                color: dealer && dealer.chips <= 0 ? 'var(--tujeon-gold)' : 'var(--tujeon-red-light)',
                textShadow: '0 2px 10px rgba(0,0,0,0.9)'
              }}
            >
              擊 破 !
            </h2>
            <p className="text-xl sm:text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}>
              {dealer && dealer.chips <= 0 ? '상 대 격 파 !' : '파 산 패 배 . . .'}
            </p>

            {/* Sub-text */}
            <p className="text-sm text-white/70 mb-8 max-w-xs mx-auto leading-relaxed">
              {dealer && dealer.chips <= 0 
                ? '상대의 자금을 완벽히 거덜냈습니다. 훌륭한 타짜이십니다!' 
                : '소지금이 완전히 고갈되었습니다. 다시 도전하여 전세를 뒤집으십시오.'}
            </p>

            {/* Score result table */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-4 mb-8 flex flex-col gap-3">
              <div className="text-xs text-white/40 tracking-wider font-bold text-left uppercase">최종 전적</div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-semibold text-white/90">나</span>
                </div>
                <span className={`text-sm font-bold ${player.chips <= 0 ? 'text-red-500' : 'text-yellow-400'}`}>
                  {player.chips <= 0 ? '0 (파산)' : `${player.chips.toLocaleString()} 냥`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-sm font-semibold text-white/90">딜러 (상대)</span>
                </div>
                <span className={`text-sm font-bold ${dealer.chips <= 0 ? 'text-red-500' : 'text-yellow-400'}`}>
                  {dealer.chips <= 0 ? '0 (파산)' : `${dealer.chips.toLocaleString()} 냥`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <Button 
                onClick={() => {
                  restartGagu();
                }}
                className="flex-1 font-bold text-sm tracking-wide text-black"
                size="md"
              >
                다시 시작
              </Button>
              <Button 
                onClick={() => {
                  resetGagu();
                  router.push('/');
                }}
                variant="secondary"
                className="flex-1 font-bold text-sm tracking-wide"
                size="md"
              >
                홈으로 가기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rule Helper ── */}
      <GaguRuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
