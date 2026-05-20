'use client';

import React, { useEffect, useState } from 'react';
import { useGagupanStore } from '@/logic/useGagupanStore';
import CardComponent from './CardComponent';
import Button from '@/components/ui/Button';
import GagupanRuleHelper from './GagupanRuleHelper';
import VictoryEffect from '@/components/ui/VictoryEffect';
import { useRouter } from 'next/navigation';
import { BettingSpotId } from '@/types/game';

const CHIP_VALUES = [10, 50, 100, 500];

const SPOT_NAMES: Record<BettingSpotId, { ko: string; hanja: string }> = {
  DONG: { ko: '동', hanja: '東' },
  SEO: { ko: '서', hanja: '西' },
  NAM: { ko: '남', hanja: '南' },
};

export default function GagupanBoard() {
  const router = useRouter();
  const {
    gamePhase,
    spots,
    banker,
    playerBalances,
    winnerResults,
    betAmount,
    roundNumber,
    initGagupan,
    placeBet,
    clearBets,
    confirmBets,
    nextRound,
    resetGagupan,
  } = useGagupanStore();

  const [showRuleHelper, setShowRuleHelper] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number>(100);

  // Initialize on mount
  useEffect(() => {
    initGagupan();
  }, [initGagupan]);

  // Auto-start next round after 10 seconds if user is idle in result phase
  useEffect(() => {
    if (gamePhase === 'RESULT') {
      const timer = setTimeout(() => nextRound(), 10000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, nextRound]);

  const getScoreLabel = (score: number) => {
    if (score === 9) return '갑오(9)';
    if (score === 0) return '망(0)';
    return `${score}끗`;
  };

  const isShowdown = gamePhase === 'SETTLEMENT' || gamePhase === 'RESULT';
  const isDealingOrDrawing = gamePhase === 'DEAL' || gamePhase === 'DRAW_PHASE';
  const showCards = isDealingOrDrawing || isShowdown;

  // Calculate user's win amount in result phase
  const calculateTotalWinAmount = () => {
    if (gamePhase !== 'RESULT') return 0;
    let net = 0;
    (Object.keys(spots) as BettingSpotId[]).forEach((spotId) => {
      const bet = spots[spotId].bets['player-0'] || 0;
      const res = winnerResults[spotId];
      if (res === 'WIN') net += bet;
      else if (res === 'LOSE') net -= bet;
    });
    return net;
  };

  const netGain = calculateTotalWinAmount();

  // General singleplay Victory/Defeat visual trigger
  const getVictoryEffectType = () => {
    if (gamePhase !== 'RESULT') return null;
    if (netGain > 0) return 'VICTORY';
    if (netGain < 0) return 'DEFEAT';
    return 'DRAW';
  };

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col relative overflow-hidden text-white select-none">
      <VictoryEffect type={getVictoryEffectType()} />

      {/* ── Status Bar ── */}
      <div className="status-bar relative z-20">
        <button
          onClick={() => {
            resetGagupan();
            router.push('/');
          }}
          className="status-bar-back"
          aria-label="홈으로"
        >
          ←
        </button>
        <div className="status-bar-item">
          <span style={{ fontFamily: 'var(--font-serif)' }}>가구판</span>
          <span className="status-bar-value ml-1">R{roundNumber}</span>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="ink-panel px-3 py-1 flex items-center gap-1.5 text-xs sm:text-sm font-bold">
            <span style={{ color: 'var(--tujeon-gold-light)' }}>💰 내 자금:</span>
            <span className="text-yellow-400 tabular-nums">
              {(playerBalances['player-0'] || 0).toLocaleString()} 냥
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowRuleHelper(true)}
          className="status-bar-back"
          aria-label="규칙 도우미"
          style={{ fontSize: '0.9rem' }}
        >
          ?
        </button>
      </div>

      {/* ── Banker Area (북 - BUK) ── */}
      <div className="pt-[calc(44px+env(safe-area-inset-top)+10px)] px-4 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--tujeon-gold-dim)',
              fontFamily: 'var(--font-serif)',
            }}
          >
            물주 (북)
          </span>
          {showCards && (
            <span className="ink-panel px-2 py-0.5 text-xs font-bold text-yellow-400">
              {getScoreLabel(banker.score)}
            </span>
          )}
        </div>

        {/* Banker Cards */}
        <div className="flex justify-center gap-1.5 min-h-[102px]">
          {banker.cards.map((card, idx) => (
            <CardComponent
              key={card.id}
              card={card}
              isFaceUp={showCards}
              size="md"
              dealDelay={idx * 150}
            />
          ))}
          {!showCards && (
            <div className="flex gap-1.5">
              <div className="card-back rounded-lg opacity-40" style={{ width: 68, height: 102 }} />
              <div className="card-back rounded-lg opacity-40" style={{ width: 68, height: 102 }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Table Layout (Center: Betting Spots DONG / SEO / NAM) ── */}
      <div className="flex-grow flex flex-col justify-center px-4 py-2 relative z-10">
        <div className="grid grid-cols-3 gap-2.5 max-w-lg mx-auto w-full">
          {(Object.keys(spots) as BettingSpotId[]).map((spotId) => {
            const spot = spots[spotId];
            const name = SPOT_NAMES[spotId];
            const myBet = spot.bets['player-0'] || 0;
            const spotResult = winnerResults[spotId];

            return (
              <div
                key={spotId}
                onClick={() => {
                  if (gamePhase === 'BETTING') {
                    placeBet(spotId, selectedChip);
                  }
                }}
                className={`relative rounded-xl p-2.5 flex flex-col items-center justify-between min-h-[220px] transition-all duration-300 ${
                  gamePhase === 'BETTING'
                    ? 'cursor-pointer hover:scale-[1.03] active:scale-95'
                    : ''
                }`}
                style={{
                  background: 'rgba(15, 23, 17, 0.45)',
                  boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.6), 0 4px 15px rgba(0, 0, 0, 0.2)',
                  border: myBet > 0 
                    ? '1.5px solid var(--tujeon-gold-dim)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Spot Hanja / Name Background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04]">
                  <span className="text-[120px] font-black leading-none">{name.hanja}</span>
                </div>

                {/* Spot Header */}
                <div className="w-full flex items-center justify-between z-10">
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontFamily: 'var(--font-serif)',
                    }}
                  >
                    {name.ko} ({name.hanja})
                  </span>

                  {/* Spot Score Indicator */}
                  {showCards && spot.cards.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-yellow-300">
                      {getScoreLabel(spot.score)}
                    </span>
                  )}
                </div>

                {/* Spot Cards Container */}
                <div className="flex flex-wrap justify-center gap-1 my-2 z-10 w-full min-h-[78px]">
                  {showCards && spot.cards.map((card, idx) => (
                    <CardComponent
                      key={card.id}
                      card={card}
                      isFaceUp={showCards}
                      size="sm"
                      dealDelay={idx * 150}
                    />
                  ))}
                  {!showCards && (
                    <div className="flex gap-1">
                      <div className="card-back rounded-md opacity-20" style={{ width: 52, height: 78 }} />
                      <div className="card-back rounded-md opacity-20" style={{ width: 52, height: 78 }} />
                    </div>
                  )}
                </div>

                {/* Bet display & interaction */}
                <div className="w-full flex flex-col items-center gap-1 z-10">
                  {myBet > 0 ? (
                    <div className="flex flex-col items-center">
                      {/* Interactive stack representation */}
                      <div className="relative w-8 h-8 flex items-center justify-center mb-1">
                        <span className="text-xl animate-bounce">🪙</span>
                      </div>
                      <span className="text-xs font-bold text-yellow-400 tabular-nums">
                        {myBet.toLocaleString()} 냥
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] opacity-40 text-center leading-tight">
                      {gamePhase === 'BETTING' ? '여기를 눌러\n베팅' : '베팅 없음'}
                    </span>
                  )}
                </div>

                {/* Individual Spot Settlement Status Badge */}
                {gamePhase === 'RESULT' && spotResult && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl animate-fade-in pointer-events-none"
                    style={{
                      background:
                        spotResult === 'WIN'
                          ? 'rgba(76, 175, 80, 0.12)'
                          : spotResult === 'LOSE'
                          ? 'rgba(244, 67, 54, 0.12)'
                          : 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div
                      className="px-3 py-1.5 rounded-full font-bold text-sm shadow-lg tracking-wider"
                      style={{
                        background:
                          spotResult === 'WIN'
                            ? '#2e7d32'
                            : spotResult === 'LOSE'
                            ? '#c62828'
                            : '#424242',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      }}
                    >
                      {spotResult === 'WIN' ? '승 (WIN)' : spotResult === 'LOSE' ? '패 (LOSE)' : '무 (DRAW)'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Info & Phase Messages ── */}
      <div className="text-center py-2 h-8 flex items-center justify-center z-10">
        <span
          className="text-xs sm:text-sm font-bold tracking-wide"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-dim)' }}
        >
          {gamePhase === 'BETTING' && '동, 서, 남 구역에 칩을 베팅하고 확인을 누르세요.'}
          {gamePhase === 'DEAL' && '카드를 돌리는 중...'}
          {gamePhase === 'DRAW_PHASE' && '5점 이하 구역 추가 드로우 진행 중...'}
          {gamePhase === 'SETTLEMENT' && '물주와 각 구역의 결과를 비교하여 정산 중...'}
          {gamePhase === 'RESULT' && (
            <span className="text-base text-yellow-300 font-extrabold animate-pulse">
              결과: {netGain > 0 ? `+${netGain.toLocaleString()} 냥 획득!` : netGain < 0 ? `${netGain.toLocaleString()} 냥 상실` : '무승부 (원금 반환)'}
            </span>
          )}
        </span>
      </div>

      {/* ── Betting & Action Dock ── */}
      <div className="w-full flex flex-col items-center bg-black/60 backdrop-blur-md pt-3 pb-safe-bottom border-t border-white/5 z-20">
        {gamePhase === 'BETTING' && (
          <div className="w-full max-w-md px-4 flex flex-col gap-3">
            {/* Chip selector */}
            <div className="flex items-center justify-around gap-2 px-2 py-1 rounded-full bg-black/40 border border-white/5">
              {CHIP_VALUES.map((val) => (
                <button
                  key={val}
                  onClick={() => setSelectedChip(val)}
                  className={`relative w-12 h-12 rounded-full font-bold text-[11px] tracking-wider transition-all duration-300 ${
                    selectedChip === val
                      ? 'scale-110 shadow-[0_0_15px_rgba(212,160,23,0.6)] border-[2.5px] border-yellow-400'
                      : 'opacity-65 hover:opacity-100 scale-95 border border-white/10'
                  }`}
                  style={{
                    background:
                      val === 10
                        ? 'radial-gradient(circle, #5b8fb9 0%, #305877 100%)'
                        : val === 50
                        ? 'radial-gradient(circle, #7fb069 0%, #4a6f3a 100%)'
                        : val === 100
                        ? 'radial-gradient(circle, #d4a017 0%, #8c690a 100%)'
                        : 'radial-gradient(circle, #b85c5c 0%, #7c3535 100%)',
                    boxShadow: selectedChip === val ? 'inset 0 0 8px rgba(255,255,255,0.4)' : 'none',
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center font-black">
                    {val}
                  </div>
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 w-full pb-3">
              <Button
                onClick={clearBets}
                variant="secondary"
                size="md"
                className="flex-1 font-bold text-xs"
              >
                베팅 초기화
              </Button>
              <Button
                onClick={confirmBets}
                size="md"
                className="flex-1 font-bold text-xs"
              >
                베팅 확정
              </Button>
            </div>
          </div>
        )}

        {gamePhase === 'RESULT' && (
          <div className="w-full max-w-xs px-4 pb-3 flex justify-center">
            <Button
              onClick={nextRound}
              size="md"
              className="w-full font-bold text-sm tracking-wide"
            >
              다음 판 진행
            </Button>
          </div>
        )}

        {isDealingOrDrawing && (
          <div className="w-full max-w-xs px-4 pb-4 flex justify-center text-xs opacity-50 italic">
            대결 진행 대기 중...
          </div>
        )}
      </div>

      {/* ── Rule Helper ── */}
      <GagupanRuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
