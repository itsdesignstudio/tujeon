'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO } from '@/types/game';
import CardComponent from '../game/CardComponent';
import Button from '@/components/ui/Button';
import GagupanRuleHelper from '../game/GagupanRuleHelper';
import VictoryEffect from '@/components/ui/VictoryEffect';

const CHIP_VALUES = [10, 50, 100, 500];

const SPOT_NAMES = {
  DONG: { ko: '동', hanja: '東' },
  SEO: { ko: '서', hanja: '西' },
  NAM: { ko: '남', hanja: '南' },
};

export default function MultiplayGagupanBoard() {
  const router = useRouter();
  const {
    myId,
    roomId,
    isHost,
    gameState,
    publicPlayers,
    placeBetGagupan,
    clearBetsGagupan,
    confirmBetsGagupan,
    dealGagupan,
    startNextRound,
    leaveRoom,
  } = useMultiplayStore();

  const phase = gameState?.phase || 'LOBBY';
  const spots = gameState?.gagupanSpots || {
    DONG: { cards: [], score: 0 },
    SEO: { cards: [], score: 0 },
    NAM: { cards: [], score: 0 },
  };
  const banker = gameState?.gagupanBanker || { cards: [], score: 0 };
  const bets = gameState?.gagupanBets || {};
  const winnerResults = gameState?.gagupanWinnerResults || {};
  const confirmedPlayers = gameState?.gagupanConfirmedPlayers || {};

  const [showRuleHelper, setShowRuleHelper] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number>(100);

  // Host = Banker (BUK)
  const hostId = useMemo(() => {
    return Object.keys(publicPlayers).find((uid) => {
      // Find Host. Since room starts with host, Host's score or room presence is verified.
      // Usually, the first player or we can match via RTDB or state.
      // Here, isHost tells us if we are the host. If isHost is true, hostId is myId.
      // Otherwise, the host is the player who is NOT me (in 2 player rooms), or we can check who has currentTurn in lobby, etc.
      // Simply: The one who is the Banker.
      return uid; // For fallback, we will determine based on store
    }) || '';
  }, [publicPlayers]);

  // Actually, we can get hostId by finding the one who created the room or we can find who isHost.
  // In our Firebase database, the Host created the room. Let's assume the host player is isHost.
  // To get the hostId cleanly:
  const actualHostId = useMemo(() => {
    // If we are host, myId is hostId
    if (isHost && myId) return myId;
    // Otherwise, host is the other player who is online
    const otherPlayers = Object.keys(publicPlayers);
    // Find a player that isn't us. In a 2-player lobby, the host is usually the first one or we can assume the host is the one who isn't me but is host.
    // However, since we don't store "hostId" explicitly in RTDB RoomConfig, let's look at publicPlayers.
    // In our `createRoom` method: `currentTurn: myId` (host starts initially).
    // So the host is the player who started. We can assume the host is the one with isHost = true.
    // For clients, let's treat the room creator as the host. We can pass it or determine it.
    // In Tujeon, we can just treat `isHost === true` as the banker. If we are not host, the host is the player who isn't us (in 2-player room).
    const nonMe = otherPlayers.find(id => id !== myId);
    return isHost ? myId : (nonMe || '');
  }, [isHost, myId, publicPlayers]);

  const isBanker = myId === actualHostId;

  // Auto-start next round after 12 seconds for Host


  const getScoreLabel = (score: number) => {
    if (score === 9) return '갑오(9)';
    if (score === 0) return '망(0)';
    return `${score}끗`;
  };

  const parseCardId = (cardId: string) => {
    const parts = cardId.split('_');
    if (parts.length !== 2) return null;
    const suit = parts[0] as keyof typeof SUIT_INFO;
    const rank = parseInt(parts[1], 10);
    const suitInfo = SUIT_INFO[suit];
    if (!suitInfo) return null;
    return { suit, rank, suitInfo };
  };

  const handleLeave = () => {
    leaveRoom();
    router.push('/');
  };

  const isShowdown = phase === 'SETTLEMENT' || phase === 'RESULT';
  const isDealingOrDrawing = phase === 'DEAL' || phase === 'DRAW_PHASE';
  const showCards = isDealingOrDrawing || isShowdown;

  // Calculate my win/loss net gain in result phase
  const netGain = useMemo(() => {
    if (phase !== 'RESULT' || !myId) return 0;
    
    if (isBanker) {
      // Banker's net gain is the opposite of all players' net gains
      let bankerNet = 0;
      Object.entries(bets).forEach(([spotId, spotBets]) => {
        const res = winnerResults[spotId];
        Object.entries(spotBets).forEach(([playerId, betAmount]) => {
          if (playerId === myId) return; // ignore self betting if any
          if (res === 'WIN') {
            bankerNet -= betAmount; // Player won, Banker pays 1x bet
          } else if (res === 'LOSE') {
            bankerNet += betAmount; // Player lost, Banker takes bet
          }
        });
      });
      return bankerNet;
    } else {
      // Player's net gain
      let playerNet = 0;
      Object.keys(spots).forEach((spotId) => {
        const bet = bets[spotId]?.[myId] || 0;
        const res = winnerResults[spotId];
        if (res === 'WIN') playerNet += bet;
        else if (res === 'LOSE') playerNet -= bet;
      });
      return playerNet;
    }
  }, [phase, myId, isBanker, bets, winnerResults, spots]);

  const getVictoryEffectType = () => {
    if (phase !== 'RESULT') return null;
    if (netGain > 0) return 'VICTORY';
    if (netGain < 0) return 'DEFEAT';
    return 'DRAW';
  };

  // Check if all non-banker players have confirmed their bets
  const isAllPlayersConfirmed = useMemo(() => {
    const players = Object.keys(publicPlayers).filter((uid) => uid !== actualHostId);
    if (players.length === 0) return false;
    return players.every((uid) => confirmedPlayers[uid] === true);
  }, [publicPlayers, actualHostId, confirmedPlayers]);

  // Check if at least one bet is placed in the room
  const isAnyBetPlaced = useMemo(() => {
    return Object.values(bets).some((spotBets) =>
      Object.values(spotBets).some((amount) => amount > 0)
    );
  }, [bets]);

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col relative overflow-hidden text-white select-none">
      <VictoryEffect type={getVictoryEffectType()} />

      {/* ── Status Bar ── */}
      <div className="status-bar relative z-20">
        <button onClick={handleLeave} className="status-bar-back" aria-label="나가기">
          ←
        </button>
        <div className="status-bar-item">
          <span style={{ fontFamily: 'var(--font-serif)' }}>가구판</span>
          <span className="status-bar-value ml-1 text-xs opacity-75">
            {isBanker ? '물주(뱅커)' : '꾼(플레이어)'}
          </span>
        </div>
        <div className="flex-grow flex items-center justify-center">
          {myId && publicPlayers[myId] && (
            <div className="ink-panel px-3 py-1 flex items-center gap-1.5 text-xs sm:text-sm font-bold">
              <span style={{ color: 'var(--tujeon-gold-light)' }}>💰 내 자금:</span>
              <span className="text-yellow-400 tabular-nums">
                {publicPlayers[myId].score.toLocaleString()} 냥
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowRuleHelper(true)}
          className="status-bar-back"
          aria-label="규칙"
          style={{ fontSize: '0.9rem' }}
        >
          ?
        </button>
      </div>

      {/* ── Banker Area (북 - BUK / Banker) ── */}
      <div className="pt-[calc(44px+env(safe-area-inset-top)+8px)] px-4 flex flex-col items-center gap-1">
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
            물주 (북 · {(actualHostId ? publicPlayers[actualHostId] : undefined)?.name || '방장'})
          </span>
          {showCards && (
            <span className="ink-panel px-2 py-0.5 text-xs font-bold text-yellow-400">
              {getScoreLabel(banker.score)}
            </span>
          )}
        </div>

        {/* Banker Cards */}
        <div className="flex justify-center gap-1.5 min-h-[102px]">
          {showCards && banker.cards ? (
            banker.cards.map((cardId: string, idx: number) => {
              const parsed = parseCardId(cardId);
              if (!parsed) return null;
              const card: Card = { id: cardId, suit: parsed.suit as Card['suit'], rank: parsed.rank, imageUrl: '' };
              return <CardComponent key={cardId} card={card} isFaceUp={showCards} size="md" dealDelay={idx * 150} />;
            })
          ) : (
            <div className="flex gap-1.5">
              <div className="card-back rounded-lg opacity-40" style={{ width: 68, height: 102 }} />
              <div className="card-back rounded-lg opacity-40" style={{ width: 68, height: 102 }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Table Layout (Betting Spots) ── */}
      <div className="flex-grow flex flex-col justify-center px-4 py-2 relative z-10">
        <div className="grid grid-cols-3 gap-2.5 max-w-lg mx-auto w-full">
          {(['DONG', 'SEO', 'NAM'] as ('DONG' | 'SEO' | 'NAM')[]).map((spotId) => {
            const spot = spots[spotId];
            const name = SPOT_NAMES[spotId];
            const spotResult = winnerResults[spotId];

            // Calculate total bets on this spot from all players
            const spotBets = bets[spotId] || {};
            const totalBet = Object.values(spotBets).reduce((a, b) => a + b, 0);
            const myBet = spotBets[myId || ''] || 0;

            return (
              <div
                key={spotId}
                onClick={() => {
                  if (phase === 'BETTING' && !isBanker && !confirmedPlayers[myId || '']) {
                    placeBetGagupan(spotId, selectedChip);
                  }
                }}
                className={`relative rounded-xl p-2.5 flex flex-col items-center justify-between min-h-[220px] transition-all duration-300 ${
                  phase === 'BETTING' && !isBanker && !confirmedPlayers[myId || '']
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
                {/* Spot Hanja Background */}
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
                  {showCards && spot?.cards && spot.cards.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-yellow-300">
                      {getScoreLabel(spot.score)}
                    </span>
                  )}
                </div>

                {/* Spot Cards */}
                <div className="flex flex-wrap justify-center gap-1 my-2 z-10 w-full min-h-[78px]">
                  {showCards && spot?.cards ? (
                    spot.cards.map((cardId: string, idx: number) => {
                      const parsed = parseCardId(cardId);
                      if (!parsed) return null;
                      const card: Card = { id: cardId, suit: parsed.suit as Card['suit'], rank: parsed.rank, imageUrl: '' };
                      return <CardComponent key={cardId} card={card} isFaceUp={showCards} size="sm" dealDelay={idx * 150} />;
                    })
                  ) : (
                    <div className="flex gap-1">
                      <div className="card-back rounded-md opacity-20" style={{ width: 52, height: 78 }} />
                      <div className="card-back rounded-md opacity-20" style={{ width: 52, height: 78 }} />
                    </div>
                  )}
                </div>

                {/* Bets Information List */}
                <div className="w-full flex flex-col items-center gap-0.5 z-10">
                  {totalBet > 0 ? (
                    <div className="flex flex-col items-center w-full">
                      {/* 🪙 Animated icon */}
                      <span className="text-lg animate-bounce mb-0.5">🪙</span>
                      <span className="text-[10px] font-bold text-yellow-400 tabular-nums">
                        합계: {totalBet.toLocaleString()} 냥
                      </span>
                      {/* Individual bets breakdown */}
                      <div className="w-full mt-1 max-h-[36px] overflow-y-auto flex flex-col items-center gap-0.5 bg-black/30 rounded py-0.5 px-1 border border-white/5">
                        {Object.entries(spotBets).map(([uid, amt]) => {
                          if (amt === 0) return null;
                          const name = publicPlayers[uid]?.name || '유저';
                          const isMe = uid === myId;
                          return (
                            <span key={uid} className="text-[8px] leading-tight opacity-75 truncate max-w-full text-center">
                              {isMe ? '나' : name}: {amt}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[9px] opacity-35 text-center leading-tight">
                      {phase === 'BETTING' && !isBanker && !confirmedPlayers[myId || '']
                        ? '터치하여\n베팅'
                        : '베팅 없음'}
                    </span>
                  )}
                </div>

                {/* Victory/Defeat Indicator Overlay */}
                {phase === 'RESULT' && spotResult && (
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
                      className="px-2.5 py-1.5 rounded-full font-bold text-xs shadow-lg tracking-wider"
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

      {/* ── Status & Phase Info Text ── */}
      <div className="text-center py-2 h-10 flex flex-col items-center justify-center z-10 px-4">
        {phase === 'BETTING' && (
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-xs font-bold"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-dim)' }}
            >
              {isBanker ? '꾼들이 베팅을 진행하고 있습니다...' : '구역을 누르고 베팅 확정을 해주세요.'}
            </span>
            <div className="flex gap-1.5 flex-wrap justify-center mt-1 max-w-xs">
              {Object.entries(publicPlayers)
                .filter(([uid]) => uid !== actualHostId)
                .map(([uid, info]) => (
                  <span
                    key={uid}
                    className="text-[9px] px-1.5 py-0.5 rounded border"
                    style={{
                      background: confirmedPlayers[uid] ? 'rgba(127,176,105,0.2)' : 'rgba(0,0,0,0.3)',
                      borderColor: confirmedPlayers[uid] ? '#7fb069' : 'rgba(255,255,255,0.1)',
                      color: confirmedPlayers[uid] ? '#7fb069' : 'white',
                    }}
                  >
                    {info.name}: {confirmedPlayers[uid] ? '확정' : '베팅 중'}
                  </span>
                ))}
            </div>
          </div>
        )}
        {phase === 'DEAL' && (
          <span className="text-xs font-bold italic opacity-60">카드를 돌리는 중...</span>
        )}
        {phase === 'DRAW_PHASE' && (
          <span className="text-xs font-bold animate-pulse text-yellow-300">5점 이하 구역 추가 드로우 진행 중...</span>
        )}
        {phase === 'SETTLEMENT' && (
          <span className="text-xs font-bold italic opacity-60">물주 정산 계산 중...</span>
        )}
        {phase === 'RESULT' && (
          <div className="flex flex-col items-center">
            <span className="text-base text-yellow-300 font-extrabold animate-pulse">
              정산 결과: {netGain > 0 ? `+${netGain.toLocaleString()} 냥 획득!` : netGain < 0 ? `${netGain.toLocaleString()} 냥 상실` : '무승부 (변동 없음)'}
            </span>

          </div>
        )}
      </div>

      {/* ── Action & Betting Console Dock ── */}
      <div className="w-full flex flex-col items-center bg-black/60 backdrop-blur-md pt-3 pb-safe-bottom border-t border-white/5 z-20">
        {phase === 'BETTING' && !isBanker && !confirmedPlayers[myId || ''] && (
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

            {/* Betting actions */}
            <div className="flex gap-2 w-full pb-3">
              <Button
                onClick={() => clearBetsGagupan()}
                variant="secondary"
                size="md"
                className="flex-1 font-bold text-xs"
              >
                베팅 초기화
              </Button>
              <Button
                onClick={() => confirmBetsGagupan()}
                disabled={!isAnyBetPlaced}
                size="md"
                className="flex-1 font-bold text-xs"
              >
                베팅 확정
              </Button>
            </div>
          </div>
        )}

        {phase === 'BETTING' && !isBanker && confirmedPlayers[myId || ''] && (
          <div className="w-full max-w-xs px-4 pb-4 flex justify-center text-xs opacity-50 italic">
            베팅 완료! 다른 플레이어와 물주의 시작을 기다립니다...
          </div>
        )}

        {phase === 'BETTING' && isBanker && (
          <div className="w-full max-w-xs px-4 pb-3 flex flex-col items-center gap-2">
            <Button
              onClick={() => dealGagupan()}
              disabled={!isAnyBetPlaced || !isAllPlayersConfirmed}
              size="md"
              className="w-full font-bold text-sm tracking-wide"
            >
              {!isAnyBetPlaced
                ? '베팅 대기 중...'
                : !isAllPlayersConfirmed
                ? '모든 유저 베팅 대기...'
                : '패 분배 시작'}
            </Button>
          </div>
        )}

        {phase === 'RESULT' && isHost && (
          <div className="w-full max-w-xs px-4 pb-3 flex justify-center">
            <Button
              onClick={() => startNextRound()}
              size="md"
              className="w-full font-bold text-sm tracking-wide"
            >
              다음 판 진행
            </Button>
          </div>
        )}

        {phase === 'RESULT' && !isHost && (
          <div className="w-full max-w-xs px-4 pb-4 flex justify-center text-xs opacity-50 italic">
            방장이 다음 판을 시작하기를 기다리는 중...
          </div>
        )}

        {isDealingOrDrawing && (
          <div className="w-full max-w-xs px-4 pb-4 flex justify-center text-xs opacity-50 italic">
            물주 대결 관람 대기 중...
          </div>
        )}
      </div>

      {/* ── Rule Helper ── */}
      <GagupanRuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
