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
import { gameAudio } from '@/lib/audio';

export default function GameBoard() {
  const router = useRouter();
  const {
    players,
    gamePhase,
    winnerId,
    roundNumber,
    betAmount,
    currentRoundBet,
    timeLeft,
    dealCards,
    toggleCardSelection,
    confirmCombination,
    declareHwang,
    evaluateHands,
    nextRound,
    resetGame,
    setBetAmount,
    restartGame,
  } = useGameStore();

  const humanPlayer = players.find((p) => !p.isBot);
  const botPlayer = players.find((p) => p.isBot);

  const [isHwangConfirmOpen, setIsHwangConfirmOpen] = useState(false);
  const [showRuleHelper, setShowRuleHelper] = useState(false);

  const isGameOver = useMemo(() => {
    return players.length > 0 && players.some((p) => p.score <= 0);
  }, [players]);

  const [hasPlayedGameOverSound, setHasPlayedGameOverSound] = useState(false);
  useEffect(() => {
    if (isGameOver && !hasPlayedGameOverSound) {
      const humanWon = botPlayer && botPlayer.score <= 0;
      if (humanWon) {
        gameAudio.playVictory();
      } else {
        gameAudio.playDefeat();
      }
      setHasPlayedGameOverSound(true);
    } else if (!isGameOver) {
      setHasPlayedGameOverSound(false);
    }
  }, [isGameOver, hasPlayedGameOverSound, botPlayer]);

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
    if (humanPlayer) setIsHwangConfirmOpen(true);
  }, [humanPlayer]);

  const confirmHwang = useCallback(() => {
    if (humanPlayer) {
      declareHwang(humanPlayer.id);
      setIsHwangConfirmOpen(false);
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
      <div className="status-bar relative flex items-center justify-between">
        {/* Left: Back Button */}
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
              {(gamePhase === 'LOBBY' || gamePhase === 'RESULT' ? betAmount : currentRoundBet) * (players.length || 2)}
            </span>
            {gamePhase !== 'LOBBY' && gamePhase !== 'RESULT' && betAmount !== currentRoundBet && (
              <span className="text-[9px] text-white/40 font-normal ml-0.5" style={{ fontFamily: 'sans-serif' }}>
                (다음 적용)
              </span>
            )}
          </button>
        </div>

        {/* Right Action Icons & Score */}
        <div className="flex items-center gap-2">
          {humanPlayer && (
            <div className="status-bar-item mr-1">
              <span style={{ fontFamily: 'var(--font-serif)' }}>💰</span>
              <span className="status-bar-value">{humanPlayer.score.toLocaleString('en-US')}</span>
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

        {/* Timer countdown badge */}
        {gamePhase === 'MAKE_COMBINATION' && timeLeft !== null && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold shadow-lg transition-all duration-300 ${
              timeLeft <= 5
                ? 'bg-red-950/80 border-red-500 text-red-500 scale-110 animate-pulse shadow-red-900/50'
                : 'bg-black/60 border-yellow-600/30 text-yellow-500'
            }`}
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            <span className={timeLeft <= 5 ? 'animate-bounce' : ''}>⏳</span>
            <span>{timeLeft}초 남음</span>
          </div>
        )}

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
          {isHwangConfirmOpen ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-2.5 px-4 bg-red-950/80 border border-red-800/40 rounded-xl animate-fade-in w-full max-w-[420px] mx-auto shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <span className="text-xs sm:text-sm font-bold text-red-200" style={{ fontFamily: 'var(--font-serif)' }}>
                  ⚠️ 정말 황(黃)을 선언하시겠습니까?
                </span>
                <span className="text-[10px] text-red-400 mt-0.5">
                  황을 선언하면 이번 라운드는 즉시 패배합니다.
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={confirmHwang}
                  variant="danger"
                  size="sm"
                  className="px-4 py-1.5 font-bold text-xs"
                >
                  선언 확정
                </Button>
                <Button
                  onClick={() => setIsHwangConfirmOpen(false)}
                  variant="secondary"
                  size="sm"
                  className="px-4 py-1.5 font-bold text-xs"
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {gamePhase === 'LOBBY' && (
        <div className="action-dock">
          <Button onClick={dealCards} size="md" className="flex-1 max-w-[220px]">
            게임 시작
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
                color: botPlayer && botPlayer.score <= 0 ? 'var(--tujeon-gold)' : 'var(--tujeon-red-light)',
                textShadow: '0 2px 10px rgba(0,0,0,0.9)'
              }}
            >
              擊 破 !
            </h2>
            <p className="text-xl sm:text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}>
              {botPlayer && botPlayer.score <= 0 ? '상 대 격 파 !' : '파 산 패 배 . . .'}
            </p>

            {/* Sub-text */}
            <p className="text-sm text-white/70 mb-8 max-w-xs mx-auto leading-relaxed">
              {botPlayer && botPlayer.score <= 0 
                ? '상대의 자금을 완벽히 거덜냈습니다. 훌륭한 타짜이십니다!' 
                : '소지금이 완전히 고갈되었습니다. 다시 도전하여 전세를 뒤집으십시오.'}
            </p>

            {/* Score result table */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-4 mb-8 flex flex-col gap-3">
              <div className="text-xs text-white/40 tracking-wider font-bold text-left uppercase">최종 전적</div>
              {players.map((p) => (
                <div key={p.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.isBot ? 'bg-blue-400' : 'bg-yellow-500'}`} />
                    <span className="text-sm font-semibold text-white/90">{p.name} {p.isBot && '(상대)'}</span>
                  </div>
                  <span className={`text-sm font-bold ${p.score <= 0 ? 'text-red-500' : 'text-yellow-400'}`}>
                    {p.score <= 0 ? '0 (파산)' : `${p.score.toLocaleString()} 냥`}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <Button 
                onClick={() => {
                  restartGame();
                }}
                className="flex-1 font-bold text-sm tracking-wide text-black"
                size="md"
              >
                다시 시작
              </Button>
              <Button 
                onClick={() => {
                  resetGame();
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



      {/* ── Rule Helper (Bottom Sheet) ── */}
      <RuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
