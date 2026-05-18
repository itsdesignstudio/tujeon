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
        return b.rank - a.rank; // Higher ranks first within suit
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
    if (currentPlayerIndex !== 0) return false; // Not human's turn
    if (currentTrick.ledSuit && hasLedSuit) {
      return card.suit === currentTrick.ledSuit;
    }
    return true; // Any card allowed if no led suit or led suit missing
  };

  const handleCardClick = (card: Card) => {
    if (canPlay(card)) {
      playCard(humanPlayer.id, card.id);
    }
  };

  // ── Trick Rendering Helpers ──
  const getTrickCardPosition = (playerId: string) => {
    if (playerId === botLeft.id) return { left: '10%', top: '50%', transform: 'translateY(-50%)' };
    if (playerId === botTop.id) return { left: '50%', top: '10%', transform: 'translateX(-50%)' };
    if (playerId === botRight.id) return { right: '10%', top: '50%', transform: 'translateY(-50%)' };
    return { left: '50%', bottom: '10%', transform: 'translateX(-50%)' }; // Human
  };

  return (
    <div className="table-felt min-h-screen flex flex-col justify-between py-6 px-4 relative overflow-hidden">
      <SutujeonRuleHelper />
      <VictoryEffect 
        type={gamePhase === 'RESULT' ? ([...players].sort((a,b) => b.tricksWon - a.tricksWon)[0].id === humanPlayer.id ? 'VICTORY' : 'DEFEAT') : null}
      />

      {/* ── Round / State Info ── */}
      <div className="absolute top-20 left-4 flex flex-col gap-2 z-10">
        <div className="glass-panel px-4 py-2 flex items-center gap-2 text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          <span style={{ fontFamily: 'var(--font-serif)' }}>트릭(라운드)</span>
          <span className="font-bold text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {totalTricksPlayed + 1} / 20
          </span>
        </div>
        {currentTrick.ledSuit && (
          <div className="glass-panel px-4 py-2 flex items-center gap-2 text-sm" style={{ color: 'var(--tujeon-gold-dim)' }}>
            <span style={{ fontFamily: 'var(--font-serif)' }}>주도 문양:</span>
            <span className="font-bold">{currentTrick.ledSuit}</span>
          </div>
        )}
      </div>

      {/* ── Opponents Layout ── */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Top Bot */}
        <div className="absolute top-0 flex flex-col items-center">
          <div className="glass-panel px-4 py-1 mb-2 text-sm" style={{ color: currentPlayerIndex === 2 ? 'var(--tujeon-gold)' : 'white' }}>
            {botTop.name} {currentPlayerIndex === 2 && ' (턴)'}
          </div>
          <div className="text-xs text-gray-400">남은 패: {botTop.cards.length} / 딴 트릭: {botTop.tricksWon}</div>
        </div>

        {/* Left Bot */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="glass-panel px-4 py-1 mb-2 text-sm" style={{ color: currentPlayerIndex === 1 ? 'var(--tujeon-gold)' : 'white' }}>
            {botLeft.name} {currentPlayerIndex === 1 && ' (턴)'}
          </div>
          <div className="text-xs text-gray-400">남은 패: {botLeft.cards.length} / 딴 트릭: {botLeft.tricksWon}</div>
        </div>

        {/* Right Bot */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="glass-panel px-4 py-1 mb-2 text-sm" style={{ color: currentPlayerIndex === 3 ? 'var(--tujeon-gold)' : 'white' }}>
            {botRight.name} {currentPlayerIndex === 3 && ' (턴)'}
          </div>
          <div className="text-xs text-gray-400">남은 패: {botRight.cards.length} / 딴 트릭: {botRight.tricksWon}</div>
        </div>

        {/* ── Trick Area (Center) ── */}
        <div className="relative w-[300px] h-[300px] border border-dashed border-white/10 rounded-full flex items-center justify-center bg-black/10">
          {currentTrick.actions.map((action, i) => {
            const pos = getTrickCardPosition(action.playerId);
            return (
              <div key={action.card.id} className="absolute transition-all duration-500 ease-out" style={pos}>
                <CardComponent card={action.card} size="sm" isFaceUp={true} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Result Modal / Next Action ── */}
      {gamePhase === 'RESULT' && (
        <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center backdrop-blur-sm">
          <div className="glass-panel p-8 text-center max-w-sm">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>게임 종료</h2>
            <div className="space-y-2 mb-6 text-left">
              {[...players].sort((a,b) => b.tricksWon - a.tricksWon).map((p, idx) => (
                <div key={p.id} className="flex justify-between border-b border-white/10 pb-1">
                  <span>{idx + 1}위: {p.name}</span>
                  <span className="font-bold" style={{ color: 'var(--tujeon-gold-dim)' }}>{p.tricksWon} 트릭</span>
                </div>
              ))}
            </div>
            <Button onClick={resetSutujeon} size="lg">다시 시작 / 메뉴로</Button>
          </div>
        </div>
      )}

      {/* ── Human Player Bottom Area ── */}
      <div className="mt-4 flex flex-col items-center z-10 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-end w-full mb-2 px-4">
          <div className="flex flex-col">
            <div className="glass-panel px-4 py-1 text-sm font-bold" style={{ color: currentPlayerIndex === 0 ? 'var(--tujeon-gold)' : 'white' }}>
              나의 패 (획득 트릭: {humanPlayer.tricksWon}) {currentPlayerIndex === 0 && ' - 당신의 턴입니다!'}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={sortMethod === 'SUIT' ? 'primary' : 'secondary'} onClick={() => setSortMethod('SUIT')}>문양별 정렬</Button>
            <Button size="sm" variant={sortMethod === 'RANK' ? 'primary' : 'secondary'} onClick={() => setSortMethod('RANK')}>숫자별 정렬</Button>
          </div>
        </div>

        {/* Hand Cards (Scrolling container) */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-2 px-4 min-w-max">
            {sortedHumanCards.map((card, idx) => (
              <CardComponent
                key={card.id}
                card={card}
                size="md"
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
