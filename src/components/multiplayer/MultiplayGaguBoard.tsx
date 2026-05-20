'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO } from '@/types/game';
import CardComponent from '../game/CardComponent';
import Button from '@/components/ui/Button';
import GaguRuleHelper from '../game/GaguRuleHelper';
import VictoryEffect from '@/components/ui/VictoryEffect';

export default function MultiplayGaguBoard() {
  const router = useRouter();
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
    startNextRound,
  } = useMultiplayStore();

  const phase = gameState?.phase || 'LOBBY';
  const isMyTurn = gameState?.currentTurn === myId;
  const myCards = privateHand as string[];
  const myGaguStatus = myId && gameState?.gaguStatus ? gameState.gaguStatus[myId] : null;

  const opponents = Object.entries(publicPlayers).filter(([uid]) => uid !== myId);
  const myInfo = myId ? publicPlayers[myId] : null;

  const [showRuleHelper, setShowRuleHelper] = React.useState(false);

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

  React.useEffect(() => {
    if (isHost && phase === 'SHOWDOWN') {
      const timer = setTimeout(() => evaluateGaguShowdown(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, evaluateGaguShowdown]);

  React.useEffect(() => {
    if (isHost && phase === 'RESULT') {
      const timer = setTimeout(() => startNextRound(), 10000);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, startNextRound]);

  const isShowdown = phase === 'SHOWDOWN' || phase === 'RESULT';

  const handleLeave = () => {
    useMultiplayStore.getState().leaveRoom();
    router.push('/');
  };

  const phaseLabels: Record<string, string> = {
    PLAYER_ACTION: '카드 선택',
    SHOWDOWN: '패 공개',
    RESULT: '결과',
    DEAL: '카드 배분',
    LOBBY: '대기',
  };

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col relative overflow-hidden">
      <VictoryEffect
        type={
          phase !== 'RESULT'
            ? null
            : gameState?.winnerId === 'DRAW'
            ? 'DRAW'
            : gameState?.winnerId === myId
            ? 'VICTORY'
            : 'DEFEAT'
        }
      />
      {/* ── Status Bar ── */}
      <div className="status-bar">
        <button onClick={handleLeave} className="status-bar-back" aria-label="나가기">←</button>
        <div className="status-bar-item">
          <span style={{ fontFamily: 'var(--font-serif)' }}>가구</span>
          <span className="status-bar-value">{phaseLabels[phase] || phase}</span>
        </div>
        <div className="flex-1" />
        {isMyTurn && (
          <span className="text-[10px] font-bold" style={{ color: 'var(--tujeon-gold-light)' }}>🎯 내 턴</span>
        )}
        <button onClick={() => setShowRuleHelper(true)} className="status-bar-back" aria-label="규칙" style={{ fontSize: '0.9rem' }}>?</button>
      </div>

      {/* ── Opponent (top) ── */}
      <div className="pt-[calc(44px+env(safe-area-inset-top)+12px)] px-3 sm:px-6 flex flex-col items-center gap-2">
        {opponents.map(([uid, info]) => (
          <div key={uid} className="flex flex-col items-center gap-1.5">
            <div className="ink-panel px-3 py-1.5 flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
                  color: 'var(--tujeon-cream)',
                }}
              >
                상대
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate" style={{ color: 'var(--tujeon-cream)' }}>{info.name}</span>
                <span className="text-[9px]" style={{ color: 'var(--tujeon-cream-dim)' }}>
                  {info.cardCount}장
                  {gameState?.gaguStatus?.[uid]?.hasStood && ' · Stand'}
                  {isShowdown && ` · ${getScoreLabel(gameState?.gaguStatus?.[uid]?.score || 0)}`}
                </span>
              </div>
              {info.isOnline !== undefined && (
                <div className="w-1.5 h-1.5 rounded-full ml-1" style={{ background: info.isOnline ? '#7fb069' : '#666' }} />
              )}
            </div>
            {/* Opponent cards */}
            <div className="flex gap-1">
              {isShowdown && gameState?.showdownHands?.[uid] ? (
                gameState.showdownHands[uid].map((cardId: string, i: number) => {
                  const parsed = parseCardId(cardId);
                  if (!parsed) return null;
                  const card: Card = { id: cardId, suit: parsed.suit as Card['suit'], rank: parsed.rank, imageUrl: '' };
                  return <CardComponent key={i} card={card} size="sm" isFaceUp={true} />;
                })
              ) : (
                Array.from({ length: info.cardCount }).map((_, i) => (
                  <div key={i} className="card-back rounded-md" style={{ width: 36, height: 54, borderWidth: 2, transform: 'none', backfaceVisibility: 'visible', position: 'relative' }} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Center Area ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 min-h-[100px]">
        <div
          className="text-sm sm:text-base font-bold text-center anim-phase-in"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={phase}
        >
          {phase === 'PLAYER_ACTION' && isMyTurn && '카드를 더 받으시겠습니까?'}
          {phase === 'PLAYER_ACTION' && !isMyTurn && '상대방의 턴입니다...'}
          {phase === 'SHOWDOWN' && '패 공개 중...'}
        </div>
      </div>

      {/* ── My Hand (bottom) ── */}
      <div className="px-3 sm:px-6 pb-3 relative z-10 flex flex-col items-center gap-1.5">
        {myInfo && (
          <div className="ink-panel px-3 py-1.5 flex items-center gap-2 justify-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))', color: 'var(--tujeon-black)', fontFamily: 'var(--font-serif)' }}
            >
              나
            </div>
            <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}>
              {myInfo.name} {myGaguStatus?.hasStood && '(Stand)'}
            </span>
            <span className="ink-panel px-2 py-0.5 text-xs font-bold ml-auto" style={{ color: 'var(--tujeon-gold-light)' }}>
              {myGaguStatus ? getScoreLabel(myGaguStatus.score) : '?'}
            </span>
          </div>
        )}
        <div className="card-fan flex items-end justify-center gap-1 sm:gap-2">
          {myCards.map((cardId, idx) => {
            const parsed = parseCardId(cardId);
            if (!parsed) return null;
            const card: Card = { id: cardId, suit: parsed.suit as Card['suit'], rank: parsed.rank, imageUrl: '' };
            return <CardComponent key={cardId} card={card} isFaceUp={true} isDisabled={true} dealDelay={idx * 100} size="md" />;
          })}
        </div>
      </div>

      {/* ── Action Dock ── */}
      {(phase === 'PLAYER_ACTION' || phase === 'SHOWDOWN') && (
        <div className="action-dock">
          <Button
            onClick={() => hitGagu()}
            disabled={phase === 'SHOWDOWN' || !isMyTurn || myGaguStatus?.hasStood || myCards.length >= 3}
            size="md"
            className="flex-1 max-w-[180px]"
          >
            {phase === 'SHOWDOWN'
              ? '패 공개 중...'
              : !isMyTurn
              ? '상대방 턴...'
              : myGaguStatus?.hasStood
              ? '멈춤 완료'
              : '한 장 더 받기'}
          </Button>
          <Button
            onClick={() => standGagu()}
            disabled={phase === 'SHOWDOWN' || !isMyTurn || myGaguStatus?.hasStood}
            variant="secondary"
            size="md"
            className="flex-1 max-w-[140px]"
          >
            멈추기
          </Button>
        </div>
      )}

      {phase === 'RESULT' && isHost && (
        <div className="action-dock">
          <Button onClick={() => startNextRound()} size="md" className="flex-1 max-w-[180px]">다음 판</Button>
          <span className="text-[10px]" style={{ color: 'var(--tujeon-cream-dim)' }}>(10초 후 자동 시작)</span>
        </div>
      )}

      {/* Spacer for action dock - stable and permanent */}
      <div style={{ height: 'calc(52px + env(safe-area-inset-bottom))' }} />

      <GaguRuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
