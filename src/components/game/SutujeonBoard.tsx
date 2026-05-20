'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSutujeonStore } from '@/logic/useSutujeonStore';
import { Card, SUIT_INFO } from '@/types/game';
import { evaluateTrickWinner } from '@/logic/engine/sutujeon';
import CardComponent from './CardComponent';
import SutujeonRuleHelper from './SutujeonRuleHelper';
import Button from '@/components/ui/Button';
import VictoryEffect from '@/components/ui/VictoryEffect';
import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

type SortMethod = 'SUIT' | 'RANK';

export default function SutujeonBoard() {
  const router = useRouter();
  const {
    players,
    currentTrick,
    gamePhase,
    currentPlayerIndex,
    leadPlayerIndex,
    totalTricksPlayed,
    playCard,
    dealCards,
    resetSutujeon,
  } = useSutujeonStore();

  const [sortMethod, setSortMethod] = useState<SortMethod>('SUIT');
  const [showRuleHelper, setShowRuleHelper] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const humanPlayer = players[0];
  const botLeft = players[1];
  const botTop = players[2];
  const botRight = players[3];

  // ── Trick Winner Selection Logic ──
  const trickWinnerId = useMemo(() => {
    if (gamePhase !== 'TRICK_EVAL' || currentTrick.actions.length < 4) return null;
    try {
      return evaluateTrickWinner(currentTrick);
    } catch (e) {
      return null;
    }
  }, [gamePhase, currentTrick]);

  if (players.length < 4) return null;

  // Show result modal when game ends
  useEffect(() => {
    if (gamePhase === 'RESULT') setShowResult(true);
  }, [gamePhase]);

  // ── Sorting Logic ──
  const sortedHumanCards = useMemo(() => {
    if (!humanPlayer) return [];
    return [...humanPlayer.cards].sort((a, b) => {
      if (sortMethod === 'SUIT') {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return b.rank - a.rank;
      } else {
        if (a.rank !== b.rank) return b.rank - a.rank;
        return a.suit.localeCompare(b.suit);
      }
    });
  }, [humanPlayer, sortMethod]);

  // ── Validation ──
  const hasLedSuit = useMemo(() => {
    if (!currentTrick.ledSuit) return false;
    return humanPlayer?.cards.some((c) => c.suit === currentTrick.ledSuit);
  }, [humanPlayer?.cards, currentTrick.ledSuit]);

  const canPlay = (card: Card) => {
    if (gamePhase !== 'PLAY') return false;
    if (currentPlayerIndex !== 0) return false;
    if (currentTrick.ledSuit && hasLedSuit) return card.suit === currentTrick.ledSuit;
    return true;
  };

  const handleCardClick = (card: Card) => {
    if (canPlay(card)) playCard(humanPlayer.id, card.id);
  };

  // Auto restart
  useEffect(() => {
    if (gamePhase === 'RESULT') {
      const timer = setTimeout(() => dealCards(), 10000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, dealCards]);

  const ledSuitLabel = currentTrick.ledSuit ? SUIT_INFO[currentTrick.ledSuit]?.label || currentTrick.ledSuit : null;
  const isMyTurn = currentPlayerIndex === 0;
  const rankedPlayers = [...players].sort((a, b) => b.tricksWon - a.tricksWon);

  const BotChip = ({ bot, idx }: { bot: typeof botLeft; idx: number }) => {
    const isWinner = trickWinnerId === bot.id;
    return (
      <div
        className={`ink-panel px-2.5 py-1.5 flex items-center gap-2 relative transition-all duration-300 ${
          currentPlayerIndex === idx ? 'anim-turn-pulse ring-1 ring-yellow-600/30' : ''
        } ${
          isWinner ? 'ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] bg-yellow-950/20 scale-105' : ''
        }`}
      >
        <div
          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold shrink-0 transition-colors"
          style={{
            background: isWinner
              ? 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-light))'
              : 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
            color: isWinner ? 'var(--tujeon-black)' : 'var(--tujeon-cream)',
          }}
        >
          {idx}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] sm:text-xs font-bold truncate" style={{ color: 'var(--tujeon-cream)' }}>
            {bot.name}
          </span>
          <span className="text-[8px] sm:text-[9px]" style={{ color: 'var(--tujeon-cream-dim)' }}>
            {bot.cards.length}장 · {bot.tricksWon}수
          </span>
        </div>
        {isWinner && (
          <div className="absolute -top-3 -right-2 px-1.5 py-0.5 bg-yellow-500 text-black text-[8px] sm:text-[9px] font-extrabold rounded-full animate-bounce shadow-md">
            🏆 +1
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col relative overflow-hidden">
      <VictoryEffect
        type={
          gamePhase === 'RESULT'
            ? rankedPlayers[0].id === humanPlayer.id
              ? 'VICTORY'
              : 'DEFEAT'
            : null
        }
      />

      {/* ── Status Bar ── */}
      <div className="status-bar relative flex items-center justify-between">
        {/* Left: Back Button */}
        <button onClick={() => { resetSutujeon(); router.push('/'); }} className="status-bar-back" aria-label="홈으로">←</button>

        {/* Center: Info Badge (수 / 주도) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <div className="status-bar-item gap-1">
            <span style={{ fontFamily: 'var(--font-serif)' }}>수</span>
            <span className="status-bar-value">{totalTricksPlayed + 1}/20</span>
          </div>

          {ledSuitLabel && (
            <>
              <div className="w-px h-3 bg-white/15" />
              <div className="status-bar-item gap-1">
                <span style={{ fontFamily: 'var(--font-serif)' }}>주도</span>
                <span className="status-bar-value">{ledSuitLabel}</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Turn info & Rule Helper button */}
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: isMyTurn ? 'var(--tujeon-gold-light)' : 'var(--tujeon-cream-dim)' }}>
            {isMyTurn ? '🎯 내 턴' : `${players[currentPlayerIndex]?.name ?? '...'}`}
          </span>
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

      {/* ── Bot Info Row ── */}
      <div className="pt-[calc(44px+env(safe-area-inset-top)+8px)] px-2 sm:px-4 flex justify-center gap-2 sm:gap-3">
        <BotChip bot={botLeft} idx={1} />
        <BotChip bot={botTop} idx={2} />
        <BotChip bot={botRight} idx={3} />
      </div>

      {/* ── Trick Area (Center) ── */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="relative w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px dashed rgba(200,169,110,0.15)',
          }}
        >
          {/* Direction labels */}
          {['상', '좌', '우', '나'].map((label, i) => {
            const positions = [
              { top: 4, left: '50%', transform: 'translateX(-50%)' },
              { left: 4, top: '50%', transform: 'translateY(-50%)' },
              { right: 4, top: '50%', transform: 'translateY(-50%)' },
              { bottom: 4, left: '50%', transform: 'translateX(-50%)' },
            ];
            return (
              <span
                key={label}
                className="absolute text-[8px] opacity-20"
                style={{ ...positions[i], fontFamily: 'var(--font-serif)' }}
              >
                {label}
              </span>
            );
          })}

          {/* Led suit indicator in center */}
          {ledSuitLabel && currentTrick.actions.length === 0 && (
            <div
              className="text-2xl sm:text-3xl font-black opacity-10"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
            >
              {currentTrick.ledSuit && SUIT_INFO[currentTrick.ledSuit]?.hanja}
            </div>
          )}

          {/* Played cards */}
          {currentTrick.actions.map((action) => {
            const pos = getTrickCardPosition(action.playerId, botLeft.id, botTop.id, botRight.id);
            const isWinningCard = trickWinnerId === action.playerId;
            const isEval = gamePhase === 'TRICK_EVAL' && trickWinnerId;
            const targetPos = isEval
              ? getTrickCardPosition(trickWinnerId!, botLeft.id, botTop.id, botRight.id)
              : pos;

            return (
              <div
                key={action.card.id}
                className="absolute transition-all ease-in-out"
                style={{
                  ...targetPos,
                  zIndex: isWinningCard ? 20 : 10,
                  transform: isEval
                    ? 'scale(0.2)'
                    : isWinningCard ? 'scale(1.1)' : 'none',
                  opacity: isEval ? 0 : 1,
                  transitionDuration: isEval ? '800ms' : '500ms',
                  transitionDelay: isEval ? '800ms' : '0ms',
                }}
              >
                <CardComponent
                  card={action.card}
                  size="sm"
                  isFaceUp={true}
                  isSelected={isWinningCard}
                  selectionIndex={isWinningCard ? ('🏆' as any) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── My Hand (bottom) ── */}
      <div className="px-2 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col items-center z-10 w-full max-w-4xl mx-auto">
        {/* Info row */}
        <div className="flex justify-between items-center w-full mb-1.5 px-1 sm:px-2">
          <div className="flex items-center gap-2">
            <span
              className={`ink-panel px-2 py-0.5 text-[10px] sm:text-xs font-bold transition-all duration-300 ${
                isMyTurn ? 'anim-turn-pulse' : ''
              } ${
                trickWinnerId === humanPlayer.id ? 'ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] bg-yellow-950/20' : ''
              }`}
              style={{
                color: trickWinnerId === humanPlayer.id ? 'var(--tujeon-gold)' : isMyTurn ? 'var(--tujeon-gold)' : 'var(--tujeon-cream-dim)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              내 패 · {humanPlayer.tricksWon}수
            </span>
            {trickWinnerId === humanPlayer.id && (
              <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[9px] font-extrabold rounded-full animate-bounce shadow-md">
                🏆 +1 수 획득!
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              className={`px-2 py-1 rounded text-[10px] sm:text-xs font-bold transition-all ${
                sortMethod === 'SUIT'
                  ? 'bg-yellow-600/20 text-yellow-500'
                  : 'bg-white/5 text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setSortMethod('SUIT')}
            >
              문양
            </button>
            <button
              className={`px-2 py-1 rounded text-[10px] sm:text-xs font-bold transition-all ${
                sortMethod === 'RANK'
                  ? 'bg-yellow-600/20 text-yellow-500'
                  : 'bg-white/5 text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setSortMethod('RANK')}
            >
              숫자
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="card-hand-scroll w-full">
          <div className="card-hand-overlap mx-auto px-1 sm:px-2">
            {sortedHumanCards.map((card, idx) => (
              <CardComponent
                key={card.id}
                card={card}
                size="sm"
                isFaceUp={true}
                isDisabled={!canPlay(card)}
                onClick={() => handleCardClick(card)}
                dealDelay={idx * 25}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Result Modal ── */}
      <Modal
        isOpen={showResult && gamePhase === 'RESULT'}
        onClose={() => setShowResult(false)}
        title="게임 종료"
        bottomSheet
      >
        <div className="space-y-2 mb-5">
          {rankedPlayers.map((p, idx) => (
            <div
              key={p.id}
              className="flex justify-between items-center py-2 px-3 rounded-lg"
              style={{
                background: idx === 0 ? 'rgba(200,169,110,0.1)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
                {idx === 0 && '👑'} {idx + 1}위 {p.name}
              </span>
              <span className="font-bold" style={{ color: 'var(--tujeon-gold)', fontFamily: 'var(--font-serif)' }}>
                {p.tricksWon} 수
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setShowResult(false); dealCards(); }} size="md" className="flex-1 max-w-[200px]">다음 판</Button>
        </div>
        <p className="text-[10px] text-center mt-3 opacity-40">10초 후 자동 시작</p>
      </Modal>

      {/* ── Rule Helper ── */}
      <SutujeonRuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}

function getTrickCardPosition(playerId: string, leftId: string, topId: string, rightId: string): React.CSSProperties {
  if (playerId === leftId)  return { left: 'calc(50% - 96px)', top: 'calc(50% - 39px)', right: 'auto', bottom: 'auto', transform: 'none' };
  if (playerId === topId)   return { left: 'calc(50% - 26px)', top: 'calc(50% - 119px)', right: 'auto', bottom: 'auto', transform: 'none' };
  if (playerId === rightId) return { left: 'calc(50% + 44px)', top: 'calc(50% - 39px)', right: 'auto', bottom: 'auto', transform: 'none' };
  return { left: 'calc(50% - 26px)', top: 'calc(50% + 41px)', right: 'auto', bottom: 'auto', transform: 'none' };
}
