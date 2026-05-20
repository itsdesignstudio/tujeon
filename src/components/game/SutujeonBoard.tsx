'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSutujeonStore } from '@/logic/useSutujeonStore';
import { Card, PlayAction } from '@/types/game';
import CardComponent from './CardComponent';
import SutujeonRuleHelper from './SutujeonRuleHelper';
import Button from '@/components/ui/Button';
import VictoryEffect from '@/components/ui/VictoryEffect';

type SortMethod = 'SUIT' | 'RANK';

export default function SutujeonBoard() {
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

  const humanPlayer = players[0];
  const botLeft = players[1];
  const botTop = players[2];
  const botRight = players[3];

  if (players.length < 4) return null;

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

  // ── Validation Logic ──
  const hasLedSuit = useMemo(() => {
    if (!currentTrick.ledSuit) return false;
    return humanPlayer?.cards.some((c) => c.suit === currentTrick.ledSuit);
  }, [humanPlayer?.cards, currentTrick.ledSuit]);

  const canPlay = (card: Card) => {
    if (gamePhase !== 'PLAY') return false;
    if (currentPlayerIndex !== 0) return false;
    if (currentTrick.ledSuit && hasLedSuit) {
      return card.suit === currentTrick.ledSuit;
    }
    return true;
  };

  const handleCardClick = (card: Card) => {
    if (canPlay(card)) {
      playCard(humanPlayer.id, card.id);
    }
  };

  // Auto-start next round after 10 seconds in RESULT
  useEffect(() => {
    if (gamePhase === 'RESULT') {
      const timer = setTimeout(() => {
        dealCards();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, dealCards]);

  // ── Bot info helper ──
  const BotInfo = ({ bot, idx, className = '' }: { bot: typeof botLeft; idx: number; className?: string }) => (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="glass-panel px-2 sm:px-4 py-1 text-[10px] sm:text-sm font-bold"
        style={{ color: currentPlayerIndex === idx ? 'var(--tujeon-gold)' : 'white' }}
      >
        {bot.name}{currentPlayerIndex === idx && ' (턴)'}
      </div>
      <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
        패:{bot.cards.length} / 트릭:{bot.tricksWon}
      </div>
    </div>
  );

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col justify-between py-3 px-2 sm:py-6 sm:px-4 relative overflow-hidden">
      <SutujeonRuleHelper />
      <VictoryEffect 
        type={gamePhase === 'RESULT' ? ([...players].sort((a,b) => b.tricksWon - a.tricksWon)[0].id === humanPlayer.id ? 'VICTORY' : 'DEFEAT') : null}
      />

      {/* ── Round / State Info ── */}
      <div className="absolute top-14 sm:top-20 left-2 sm:left-4 flex flex-col gap-1.5 sm:gap-2 z-10">
        <div className="glass-panel px-2 sm:px-4 py-1 sm:py-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          <span style={{ fontFamily: 'var(--font-serif)' }}>트릭</span>
          <span className="font-bold text-xs sm:text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {totalTricksPlayed + 1}/20
          </span>
        </div>
        {currentTrick.ledSuit && (
          <div className="glass-panel px-2 sm:px-4 py-1 sm:py-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm" style={{ color: 'var(--tujeon-gold-dim)' }}>
            <span style={{ fontFamily: 'var(--font-serif)' }}>주도:</span>
            <span className="font-bold">{currentTrick.ledSuit}</span>
          </div>
        )}
      </div>

      {/* ── Opponents Layout ── */}
      {/* Mobile: Horizontal bar at top / Desktop: Positioned around trick area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Mobile top row — all 3 bots */}
        <div className="absolute top-0 left-0 right-0 flex justify-around items-start pt-1 sm:hidden z-10">
          <BotInfo bot={botLeft} idx={1} />
          <BotInfo bot={botTop} idx={2} />
          <BotInfo bot={botRight} idx={3} />
        </div>

        {/* Desktop: positioned around the circle */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2">
          <BotInfo bot={botTop} idx={2} />
        </div>
        <div className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2">
          <BotInfo bot={botLeft} idx={1} />
        </div>
        <div className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2">
          <BotInfo bot={botRight} idx={3} />
        </div>

        {/* ── Trick Area (Center) ── */}
        <div className="relative w-[180px] h-[180px] sm:w-[300px] sm:h-[300px] border border-dashed border-white/10 rounded-full flex items-center justify-center bg-black/10">
          {currentTrick.actions.map((action, i) => {
            const pos = getTrickCardPosition(action.playerId, botLeft.id, botTop.id, botRight.id);
            return (
              <div key={action.card.id} className="absolute transition-all duration-500 ease-out" style={pos}>
                <CardComponent card={action.card} size="xs" isFaceUp={true} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Result Modal / Next Action ── */}
      {gamePhase === 'RESULT' && (
        <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="glass-panel p-5 sm:p-8 text-center max-w-sm w-full">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>게임 종료</h2>
            <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-left text-sm sm:text-base">
              {[...players].sort((a,b) => b.tricksWon - a.tricksWon).map((p, idx) => (
                <div key={p.id} className="flex justify-between border-b border-white/10 pb-1">
                  <span>{idx + 1}위: {p.name}</span>
                  <span className="font-bold" style={{ color: 'var(--tujeon-gold-dim)' }}>{p.tricksWon} 트릭</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-4 items-center">
              <div className="flex gap-2">
                <Button onClick={dealCards} size="md">다음 판 시작</Button>
                <Button variant="secondary" onClick={resetSutujeon} size="md">메뉴로</Button>
              </div>
              <span className="text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
                (10초 후 자동 시작)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Human Player Bottom Area ── */}
      <div className="mt-2 sm:mt-4 flex flex-col items-center z-10 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-end w-full mb-1.5 sm:mb-2 px-2 sm:px-4 gap-2">
          <div className="flex flex-col min-w-0">
            <div className="glass-panel px-2 sm:px-4 py-1 text-[10px] sm:text-sm font-bold" style={{ color: currentPlayerIndex === 0 ? 'var(--tujeon-gold)' : 'white' }}>
              나의 패 (트릭:{humanPlayer.tricksWon}) {currentPlayerIndex === 0 && <span className="hidden sm:inline">- 당신의 턴!</span>}
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2 shrink-0">
            <Button size="sm" variant={sortMethod === 'SUIT' ? 'primary' : 'secondary'} onClick={() => setSortMethod('SUIT')}>문양</Button>
            <Button size="sm" variant={sortMethod === 'RANK' ? 'primary' : 'secondary'} onClick={() => setSortMethod('RANK')}>숫자</Button>
          </div>
        </div>

        {/* Hand Cards (Scrolling container with overlap) */}
        <div className="card-hand-scroll w-full pb-2 sm:pb-4">
          <div className="card-hand-overlap sm:card-hand-overlap px-2 sm:px-4">
            {sortedHumanCards.map((card, idx) => (
              <CardComponent
                key={card.id}
                card={card}
                size="sm"
                isFaceUp={true}
                isDisabled={currentPlayerIndex !== 0 || !canPlay(card)}
                onClick={() => handleCardClick(card)}
                dealDelay={idx * 30}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Returns absolute positioning for a trick card based on player position */
function getTrickCardPosition(playerId: string, leftId: string, topId: string, rightId: string): React.CSSProperties {
  if (playerId === leftId) return { left: '8%', top: '50%', transform: 'translateY(-50%)' };
  if (playerId === topId) return { left: '50%', top: '8%', transform: 'translateX(-50%)' };
  if (playerId === rightId) return { right: '8%', top: '50%', transform: 'translateY(-50%)' };
  return { left: '50%', bottom: '8%', transform: 'translateX(-50%)' }; // Human
}
