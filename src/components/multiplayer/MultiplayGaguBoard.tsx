'use client';

import React, { useCallback } from 'react';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO } from '@/types/game';
import CardComponent from '../game/CardComponent';
import Button from '@/components/ui/Button';

/**
 * MultiplayGaguBoard — Firebase-synced version of GaguBoard.
 * Reads game state from RTDB via useMultiplayStore.
 */
export default function MultiplayGaguBoard() {
  const {
    myId,
    gameState,
    publicPlayers,
    privateHand,
    isHost,
    hitGagu,
    standGagu,
    evaluateGaguShowdown,
    updateGameState,
  } = useMultiplayStore();

  const phase = gameState?.phase || 'LOBBY';
  const isMyTurn = gameState?.currentTurn === myId;
  const myCards = privateHand as string[];
  const myGaguStatus = myId && gameState?.gaguStatus ? gameState.gaguStatus[myId] : null;

  // Get opponent info
  const opponents = Object.entries(publicPlayers).filter(([uid]) => uid !== myId);
  const myInfo = myId ? publicPlayers[myId] : null;

  const getScoreLabel = (score: number) => {
    if (score === 9) return '갑오(9)';
    if (score === 0) return '망(0)';
    return `${score}끗`;
  };

  // Parse card ID to get suit info for rendering
  const parseCardId = (cardId: string): { suit: string; rank: number; suitInfo: typeof SUIT_INFO[keyof typeof SUIT_INFO] } | null => {
    const parts = cardId.split('_');
    if (parts.length !== 2) return null;
    const suit = parts[0] as keyof typeof SUIT_INFO;
    const rank = parseInt(parts[1], 10);
    const suitInfo = SUIT_INFO[suit];
    if (!suitInfo) return null;
    return { suit, rank, suitInfo };
  };

  // Host evaluates showdown when all players have stood (phase transitions to SHOWDOWN)
  React.useEffect(() => {
    if (isHost && phase === 'SHOWDOWN') {
      setTimeout(() => {
        evaluateGaguShowdown();
      }, 1500);
    }
  }, [isHost, phase, evaluateGaguShowdown]);

  const isShowdown = phase === 'SHOWDOWN' || phase === 'RESULT';

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col items-center justify-between py-3 px-3 sm:py-6 sm:px-4 relative overflow-hidden">
      {/* ── Ambient decorations ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ── Phase / Turn info ── */}
      <div className="absolute top-14 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <div className="glass-panel px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 text-xs sm:text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          <span style={{ fontFamily: 'var(--font-serif)' }}>가구</span>
          <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {phase}
          </span>
        </div>
        {isMyTurn && (
          <div className="glass-panel px-3 py-1.5 text-xs sm:text-sm anim-pulse-glow" style={{ color: 'var(--tujeon-gold)' }}>
            당신의 턴!
          </div>
        )}
      </div>

      {/* ── Opponent (top) ── */}
      <div className="mt-20 sm:mt-16 flex flex-col items-center gap-2">
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
                  {gameState?.gaguStatus?.[uid]?.hasStood && ' · (Stand)'}
                  {isShowdown && ` · 점수: ${getScoreLabel(gameState?.gaguStatus?.[uid]?.score || 0)}`}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              {isShowdown && gameState?.showdownHands?.[uid] ? (
                gameState.showdownHands[uid].map((cardId, i) => {
                  const parsed = parseCardId(cardId);
                  if (!parsed) return null;
                  return (
                    <div
                      key={i}
                      className="w-10 h-14 sm:w-14 sm:h-20 rounded-md flex flex-col items-center justify-center"
                      style={{
                        background: 'linear-gradient(145deg, var(--tujeon-cream), #e8d5b0)',
                        border: `2px solid ${parsed.suitInfo.color}`,
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <span className="text-sm sm:text-lg font-black" style={{ fontFamily: 'var(--font-serif)', color: parsed.suitInfo.color }}>
                        {parsed.suitInfo.hanja}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold" style={{ color: 'var(--tujeon-black)' }}>
                        {parsed.rank === 10 ? '장' : parsed.rank}
                      </span>
                    </div>
                  );
                })
              ) : (
                Array.from({ length: info.cardCount }).map((_, i) => (
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
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Center area (Status & Actions) ── */}
      <div className="flex flex-col items-center gap-4 sm:gap-6 my-4 sm:my-8">
        <div
          className="text-sm sm:text-lg font-bold anim-fade-up text-center px-4"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={phase}
        >
          {phase === 'PLAYER_ACTION' && isMyTurn && '카드를 더 받으시겠습니까?'}
          {phase === 'PLAYER_ACTION' && !isMyTurn && '상대방의 턴입니다...'}
          {phase === 'SHOWDOWN' && '패 공개 중...'}
          {phase === 'RESULT' && '라운드 종료'}
        </div>

        {/* Action Buttons */}
        {phase === 'PLAYER_ACTION' && isMyTurn && !myGaguStatus?.hasStood && (
          <div className="flex gap-3 anim-fade-up">
            <Button
              onClick={() => hitGagu()}
              disabled={myCards.length >= 3}
              className="w-32"
            >
              카드 받기
            </Button>
            <Button
              variant="secondary"
              onClick={() => standGagu()}
              className="w-32"
            >
              멈춤
            </Button>
          </div>
        )}
        {/* Removed table cards */}
      </div>

      {/* ── My Hand (bottom) ── */}
      <div className="mb-4 sm:mb-8 flex flex-col items-center gap-2 w-full max-w-lg relative">
        {/* Winner Overlay */}
        {phase === 'RESULT' && gameState?.winnerId && (
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap">
            <div className="px-6 py-3 rounded-full glass-panel border-2 border-yellow-500/50 flex items-center gap-3 anim-fade-up"
                 style={{ background: 'rgba(0,0,0,0.8)' }}>
              <span className="text-2xl font-black" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
                {gameState.winnerId === 'DRAW' ? '무승부!' : (gameState.winnerId === myId ? '승리!' : '패배...')}
              </span>
            </div>
          </div>
        )}

        {myInfo && (
          <div className="glass-panel px-3 sm:px-5 py-2 sm:py-3 flex items-center gap-3 w-full justify-center">
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
              {myInfo.name} {myGaguStatus?.hasStood && '(Stand)'}
            </span>
            <span className="text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
              내 점수: {myGaguStatus ? getScoreLabel(myGaguStatus.score) : '?'}
            </span>
          </div>
        )}

        {/* My cards */}
        <div className="flex items-end justify-center gap-1 sm:gap-2">
          {myCards.map((cardId, idx) => {
            const parsed = parseCardId(cardId);
            if (!parsed) return null;

            // Build a pseudo Card object for CardComponent
            const card: Card = {
              id: cardId,
              suit: parsed.suit as Card['suit'],
              rank: parsed.rank,
              imageUrl: '',
            };

            return (
              <CardComponent
                key={cardId}
                card={card}
                isFaceUp={true}
                isSelected={false}
                isDisabled={true} // Cards are not playable directly in Gagu
                dealDelay={idx * 100}
                size="md"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
