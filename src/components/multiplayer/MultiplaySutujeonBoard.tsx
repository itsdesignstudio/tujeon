'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO } from '@/types/game';
import CardComponent from '../game/CardComponent';
import SutujeonRuleHelper from '../game/SutujeonRuleHelper';
import { getFirebaseDb } from '@/lib/firebase';
import { ref, get as firebaseGet, update } from 'firebase/database';
import Button from '@/components/ui/Button';
import VictoryEffect from '@/components/ui/VictoryEffect';

type SortMethod = 'SUIT' | 'RANK';

export default function MultiplaySutujeonBoard() {
  const {
    myId,
    gameState,
    publicPlayers,
    privateHand,
    isHost,
    playCardSutujeon,
    evaluateSutujeonTrick,
    startNextRound,
  } = useMultiplayStore();

  const [sortMethod, setSortMethod] = useState<SortMethod>('SUIT');

  const phase = gameState?.phase || 'LOBBY';
  const isMyTurn = gameState?.currentTurn === myId;
  const myCards = privateHand as string[];
  const myInfo = myId ? publicPlayers[myId] : null;

  // ── Determine opponent positions deterministically ──
  const { leftId, topId, rightId } = useMemo(() => {
    const uids = Object.keys(publicPlayers).sort();
    if (uids.length < 4 || !myId) return { leftId: '', topId: '', rightId: '' };
    const myIndex = uids.indexOf(myId);
    return {
      leftId: uids[(myIndex + 1) % 4],
      topId: uids[(myIndex + 2) % 4],
      rightId: uids[(myIndex + 3) % 4],
    };
  }, [publicPlayers, myId]);

  // ── Parse my cards ──
  const parsedCards = useMemo(() => {
    return myCards.map((cardId) => {
      const parts = cardId.split('_');
      if (parts.length !== 2) return null;
      const suit = parts[0] as Card['suit'];
      const rank = parseInt(parts[1], 10);
      return { id: cardId, suit, rank, imageUrl: '' } as Card;
    }).filter(Boolean) as Card[];
  }, [myCards]);

  // ── Sorting Logic ──
  const sortedHumanCards = useMemo(() => {
    return [...parsedCards].sort((a, b) => {
      if (sortMethod === 'SUIT') {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return b.rank - a.rank;
      } else {
        if (a.rank !== b.rank) return b.rank - a.rank;
        return a.suit.localeCompare(b.suit);
      }
    });
  }, [parsedCards, sortMethod]);

  // ── Validation Logic ──
  const hasLedSuit = useMemo(() => {
    if (!gameState?.ledSuit) return false;
    return parsedCards.some((c) => c.suit === gameState.ledSuit);
  }, [parsedCards, gameState?.ledSuit]);

  const canPlay = (card: Card) => {
    if (phase !== 'PLAYER_ACTION') return false;
    if (!isMyTurn) return false;
    if (gameState?.ledSuit && hasLedSuit) {
      return card.suit === gameState.ledSuit;
    }
    return true;
  };

  const handleCardClick = (card: Card) => {
    if (canPlay(card)) {
      playCardSutujeon(card.id);
    }
  };

  // ── Host auto-evaluates trick ──
  useEffect(() => {
    if (isHost && phase === 'TRICK_EVAL') {
      const timer = setTimeout(() => {
        evaluateSutujeonTrick();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, evaluateSutujeonTrick]);

  // ── Host auto-plays for bots ──
  useEffect(() => {
    if (!isHost || phase !== 'PLAYER_ACTION' || !gameState?.currentTurn) return;
    const currentTurnInfo = publicPlayers[gameState.currentTurn];
    if (!currentTurnInfo?.isBot) return;

    const botId = gameState.currentTurn;
    const timer = setTimeout(async () => {
      const db = getFirebaseDb();
      // Fetch bot hand
      const botHandSnap = await firebaseGet(ref(db, `rooms/${useMultiplayStore.getState().roomId}/privatePlayers/${botId}/hand`));
      if (!botHandSnap.exists()) return;
      const botHand: string[] = botHandSnap.val();
      
      // Determine valid card
      let validCards = botHand;
      if (gameState.ledSuit) {
        const matchingSuit = botHand.filter(c => c.startsWith(gameState.ledSuit!));
        if (matchingSuit.length > 0) validCards = matchingSuit;
      }
      
      // Pick random card
      const selectedCard = validCards[Math.floor(Math.random() * validCards.length)];
      if (!selectedCard) return;

      const newHand = botHand.filter(c => c !== selectedCard);
      const suit = selectedCard.split('_')[0];
      
      const currentActions = gameState.sutujeonTrickActions || [];
      const newActions = [...currentActions, { playerId: botId, cardId: selectedCard }];
      
      const players = Object.keys(publicPlayers).sort();
      const bIdx = players.indexOf(botId);
      
      const updates: Record<string, any> = {};
      const roomId = useMultiplayStore.getState().roomId;
      
      updates[`rooms/${roomId}/privatePlayers/${botId}/hand`] = newHand;
      updates[`rooms/${roomId}/publicPlayers/${botId}/cardCount`] = newHand.length;
      updates[`rooms/${roomId}/gameState/sutujeonTrickActions`] = newActions;
      
      if (currentActions.length === 0) {
        updates[`rooms/${roomId}/gameState/ledSuit`] = suit;
      }
      
      if (newActions.length === players.length) { // Trick is complete
        updates[`rooms/${roomId}/gameState/phase`] = 'TRICK_EVAL';
        updates[`rooms/${roomId}/gameState/currentTurn`] = null;
      } else {
        const nextTurn = players[(bIdx + 1) % players.length];
        updates[`rooms/${roomId}/gameState/currentTurn`] = nextTurn;
      }
      
      await update(ref(db), updates);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [isHost, phase, gameState, publicPlayers]);

  // ── Host auto-restarts after 10 seconds in RESULT ──
  useEffect(() => {
    if (isHost && phase === 'RESULT') {
      const timer = setTimeout(() => {
        startNextRound();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, startNextRound]);

  // ── Render Helpers ──
  const OpponentInfo = ({ uid, className = '' }: { uid: string; className?: string }) => {
    const info = publicPlayers[uid];
    if (!info) return null;
    const isTheirTurn = gameState?.currentTurn === uid;
    
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className="glass-panel px-2 sm:px-4 py-1 text-[10px] sm:text-sm font-bold transition-colors"
          style={{ 
            color: isTheirTurn ? 'var(--tujeon-gold)' : 'var(--tujeon-cream)',
            borderColor: isTheirTurn ? 'var(--tujeon-gold-dim)' : undefined 
          }}
        >
          {info.name}{isTheirTurn && ' (턴)'}
        </div>
        <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
          패:{info.cardCount} / 트릭:{info.score}
        </div>
      </div>
    );
  };

  const trickActions = gameState?.sutujeonTrickActions || [];
  const totalTricksPlayed = gameState?.sutujeonTotalTricks || 0;

  const getResultType = () => {
    if (phase !== 'RESULT') return null;
    const sorted = Object.entries(publicPlayers).sort((a, b) => b[1].score - a[1].score);
    if (!sorted.length) return null;
    return sorted[0][0] === myId ? 'VICTORY' : 'DEFEAT';
  };

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col justify-between py-3 px-2 sm:py-6 sm:px-4 relative overflow-hidden">
      <SutujeonRuleHelper />
      <VictoryEffect type={getResultType()} />

      {/* ── Round / State Info ── */}
      <div className="absolute top-14 sm:top-20 left-2 sm:left-4 flex flex-col gap-1.5 sm:gap-2 z-10">
        <div className="glass-panel px-2 sm:px-4 py-1 sm:py-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          <span style={{ fontFamily: 'var(--font-serif)' }}>트릭</span>
          <span className="font-bold text-xs sm:text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {totalTricksPlayed + 1}/20
          </span>
        </div>
        {gameState?.ledSuit && (
          <div className="glass-panel px-2 sm:px-4 py-1 sm:py-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm" style={{ color: 'var(--tujeon-gold-dim)' }}>
            <span style={{ fontFamily: 'var(--font-serif)' }}>주도:</span>
            <span className="font-bold" style={{ color: SUIT_INFO[gameState.ledSuit as keyof typeof SUIT_INFO]?.color }}>
              {SUIT_INFO[gameState.ledSuit as keyof typeof SUIT_INFO]?.hanja} ({gameState.ledSuit})
            </span>
          </div>
        )}
      </div>

      {/* ── Opponents Layout ── */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Mobile top row */}
        <div className="absolute top-0 left-0 right-0 flex justify-around items-start pt-1 sm:hidden z-10">
          <OpponentInfo uid={leftId} />
          <OpponentInfo uid={topId} />
          <OpponentInfo uid={rightId} />
        </div>

        {/* Desktop positioned around the circle */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2">
          <OpponentInfo uid={topId} />
        </div>
        <div className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2">
          <OpponentInfo uid={leftId} />
        </div>
        <div className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2">
          <OpponentInfo uid={rightId} />
        </div>

        {/* ── Trick Area (Center) ── */}
        <div className="relative w-[180px] h-[180px] sm:w-[300px] sm:h-[300px] border border-dashed border-white/10 rounded-full flex items-center justify-center bg-black/10">
          {trickActions.map((action) => {
            const pos = getTrickCardPosition(action.playerId, leftId, topId, rightId);
            const parts = action.cardId.split('_');
            const card: Card = { id: action.cardId, suit: parts[0] as Card['suit'], rank: parseInt(parts[1], 10), imageUrl: '' };
            return (
              <div key={action.cardId} className="absolute transition-all duration-500 ease-out" style={pos}>
                <CardComponent card={card} size="xs" isFaceUp={true} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Result Modal / Next Action ── */}
      {phase === 'RESULT' && (
        <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="glass-panel p-5 sm:p-8 text-center max-w-sm w-full">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>게임 종료</h2>
            <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-left text-sm sm:text-base">
              {Object.entries(publicPlayers).sort((a,b) => b[1].score - a[1].score).map(([uid, p], idx) => (
                <div key={uid} className="flex justify-between border-b border-white/10 pb-1">
                  <span style={{ color: uid === myId ? 'var(--tujeon-gold)' : 'inherit' }}>
                    {idx + 1}위: {p.name} {uid === myId && '(나)'}
                  </span>
                  <span className="font-bold" style={{ color: 'var(--tujeon-gold-dim)' }}>{p.score} 트릭</span>
                </div>
              ))}
            </div>
            {isHost && (
              <div className="flex flex-col items-center gap-2 mt-4 anim-fade-up">
                <Button onClick={() => startNextRound()} size="lg" className="w-full">
                  다음 판 시작
                </Button>
                <span className="text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
                  (10초 후 자동 시작)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Human Player Bottom Area ── */}
      <div className="mt-2 sm:mt-4 flex flex-col items-center z-10 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-end w-full mb-1.5 sm:mb-2 px-2 sm:px-4 gap-2">
          <div className="flex flex-col min-w-0">
            <div className="glass-panel px-2 sm:px-4 py-1 text-[10px] sm:text-sm font-bold" style={{ color: isMyTurn ? 'var(--tujeon-gold)' : 'white' }}>
              나의 패 (트릭:{myInfo?.score || 0}) {isMyTurn && <span className="hidden sm:inline">- 당신의 턴!</span>}
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
                isDisabled={!canPlay(card)}
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
