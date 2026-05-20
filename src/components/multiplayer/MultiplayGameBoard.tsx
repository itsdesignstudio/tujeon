'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO } from '@/types/game';
import CardComponent from '../game/CardComponent';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

/**
 * MultiplayGameBoard — Firebase-synced version of GameBoard (Dolryeo-daegi).
 * Players select 3 cards to form a "house" (집), then reveal the remaining 2.
 */
export default function MultiplayGameBoard() {
  const {
    myId,
    gameState,
    publicPlayers,
    privateHand,
    isHost,
    playCard,
    updateGameState,
    startNextRound,
  } = useMultiplayStore();

  const phase = gameState?.phase || 'LOBBY';
  const isMyTurn = gameState?.currentTurn === myId;
  const myCards = privateHand as string[];

  const myInfo = myId ? publicPlayers[myId] : null;

  const { leftId, topId, rightId } = useMemo(() => {
    const uids = Object.keys(publicPlayers).sort();
    if (uids.length < 2 || !myId) return { leftId: '', topId: '', rightId: '' };
    const myIndex = uids.indexOf(myId);
    if (uids.length === 2) {
      return { leftId: '', topId: uids[(myIndex + 1) % 2], rightId: '' };
    }
    if (uids.length === 3) {
      return { leftId: uids[(myIndex + 1) % 3], topId: '', rightId: uids[(myIndex + 2) % 3] };
    }
    return {
      leftId: uids[(myIndex + 1) % 4],
      topId: uids[(myIndex + 2) % 4],
      rightId: uids[(myIndex + 3) % 4],
    };
  }, [publicPlayers, myId]);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isHwangModalOpen, setIsHwangModalOpen] = useState(false);

  // Parse card IDs into Card objects
  const parsedCards = useMemo(() => {
    return myCards.map((cardId) => {
      const parts = cardId.split('_');
      if (parts.length !== 2) return null;
      const suit = parts[0] as Card['suit'];
      const rank = parseInt(parts[1], 10);
      const suitInfo = SUIT_INFO[suit];
      if (!suitInfo) return null;
      return { id: cardId, suit, rank, imageUrl: '' } as Card;
    }).filter(Boolean) as Card[];
  }, [myCards]);

  // Selection logic
  const selectedSum = useMemo(() => {
    return parsedCards
      .filter((c) => selectedCardIds.includes(c.id))
      .reduce((acc, c) => acc + c.rank, 0);
  }, [parsedCards, selectedCardIds]);

  const canConfirm = selectedCardIds.length === 3 && selectedSum % 10 === 0;

  const toggleSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length < 3) {
        return [...prev, cardId];
      }
      return prev;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || !myId) return;
    // In a full implementation, we'd write the selection to Firebase
    // For now, update gameState to indicate confirmation
    await updateGameState({
      [`confirmed_${myId}`]: selectedCardIds.join(','),
    } as any);
  }, [canConfirm, myId, selectedCardIds, updateGameState]);

  // ── Host auto-plays for bots ──
  React.useEffect(() => {
    if (!isHost || phase !== 'MAKE_COMBINATION') return;

    const bots = Object.entries(publicPlayers).filter(([uid, info]) => info.isBot && !(gameState as any)?.[`confirmed_${uid}`]);
    if (bots.length === 0) return;

    bots.forEach(([botId]) => {
      setTimeout(async () => {
        const { getFirebaseDb } = await import('@/lib/firebase');
        const { ref, get: firebaseGet } = await import('firebase/database');
        const db = getFirebaseDb();
        const roomId = useMultiplayStore.getState().roomId;
        if (!roomId) return;
        
        const botHandSnap = await firebaseGet(ref(db, `rooms/${roomId}/privatePlayers/${botId}/hand`));
        if (!botHandSnap.exists()) return;
        
        const hand: string[] = botHandSnap.val();
        
        // Find 3 cards that sum to % 10 === 0
        let bestSelection: string[] = [];
        
        const parsed = hand.map((cardId) => {
          const parts = cardId.split('_');
          return { id: cardId, rank: parseInt(parts[1], 10) };
        });
        
        let found = false;
        for (let i = 0; i < parsed.length - 2; i++) {
          for (let j = i + 1; j < parsed.length - 1; j++) {
            for (let k = j + 1; k < parsed.length; k++) {
              if ((parsed[i].rank + parsed[j].rank + parsed[k].rank) % 10 === 0) {
                bestSelection = [parsed[i].id, parsed[j].id, parsed[k].id];
                found = true;
                break;
              }
            }
            if (found) break;
          }
          if (found) break;
        }
        
        if (!found) bestSelection = hand.slice(0, 3);
        
        await updateGameState({
          [`confirmed_${botId}`]: bestSelection.join(','),
        } as any);
        
      }, 1500 + Math.random() * 2000);
    });
  }, [isHost, phase, gameState, publicPlayers, updateGameState]);

  // ── Host phase transition check ──
  React.useEffect(() => {
    if (!isHost || phase !== 'MAKE_COMBINATION') return;
    const allPlayers = Object.keys(publicPlayers);
    const allConfirmed = allPlayers.every(uid => (gameState as any)?.[`confirmed_${uid}`]);
    if (allConfirmed) {
      updateGameState({ phase: 'SHOWDOWN' } as any);
    }
  }, [isHost, phase, gameState, publicPlayers, updateGameState]);

  // ── Host auto-evaluates showdown ──
  React.useEffect(() => {
    if (!isHost || phase !== 'SHOWDOWN') return;
    const timer = setTimeout(() => {
      useMultiplayStore.getState().evaluateDolryeodaegiShowdown?.();
    }, 2500); // Wait 2.5s for players to see showdown
    return () => clearTimeout(timer);
  }, [isHost, phase]);

  // ── Host auto-restarts after 10 seconds in RESULT ──
  React.useEffect(() => {
    if (isHost && phase === 'RESULT') {
      const timer = setTimeout(() => {
        startNextRound();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, startNextRound]);

  const OpponentInfo = ({ uid }: { uid: string }) => {
    const info = publicPlayers[uid];
    if (!info) return null;
    
    return (
      <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
        <div className="glass-panel px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2">
          <div
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
              color: 'var(--tujeon-cream)',
            }}
          >
            상대
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[10px] sm:text-xs truncate" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)', maxWidth: '60px' }}>
              {info.name}
            </span>
            <span className="text-[9px] sm:text-[10px]" style={{ color: 'var(--tujeon-cream-dim)' }}>
              카드: {info.cardCount}장
            </span>
          </div>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: info.cardCount }).map((_, i) => (
            <div
              key={i}
              className="rounded"
              style={{
                width: 20,
                height: 30,
                background: `repeating-conic-gradient(var(--tujeon-red) 0% 25%, var(--tujeon-blue) 25% 50%) 50% / 10px 10px`,
                border: '1px solid var(--tujeon-gold-dim)',
                boxShadow: 'var(--shadow-card)',
              }}
            />
          ))}
        </div>
        {/* Status */}
        {(gameState as any)?.[`confirmed_${uid}`] && (
          <div className="text-[9px] sm:text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(127,176,105,0.2)', color: '#7fb069' }}>
            준비 완료
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col items-center justify-between py-3 px-3 sm:py-6 sm:px-4 relative overflow-hidden">
      {/* ── Ambient ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)' }}
      />

      {/* ── Phase info bar ── */}
      <div className="absolute top-14 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <div className="glass-panel px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 text-xs sm:text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
          <span style={{ fontFamily: 'var(--font-serif)' }}>돌려대기</span>
          <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--tujeon-gold)' }}>
            {phase}
          </span>
        </div>
      </div>

      {/* ── Opponents Layout ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Mobile top row */}
        <div className="absolute top-20 left-0 right-0 flex justify-around items-start px-2 sm:hidden">
          <OpponentInfo uid={leftId} />
          <OpponentInfo uid={topId} />
          <OpponentInfo uid={rightId} />
        </div>

        {/* Desktop positioned around the table */}
        <div className="hidden sm:block absolute top-16 left-1/2 -translate-x-1/2">
          <OpponentInfo uid={topId} />
        </div>
        <div className="hidden sm:block absolute left-8 top-1/2 -translate-y-1/2">
          <OpponentInfo uid={leftId} />
        </div>
        <div className="hidden sm:block absolute right-8 top-1/2 -translate-y-1/2">
          <OpponentInfo uid={rightId} />
        </div>
      </div>

      {/* ── Center area ── */}
      <div className="flex flex-col items-center gap-4 sm:gap-6 my-4 sm:my-8">
        <div
          className="text-sm sm:text-lg font-bold anim-fade-up text-center px-4"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={phase}
        >
          {phase === 'MAKE_COMBINATION' && '3장을 골라 집을 지으세요'}
          {phase === 'PLAYER_ACTION' && isMyTurn && '카드를 선택하세요'}
          {phase === 'PLAYER_ACTION' && !isMyTurn && '상대방의 턴입니다...'}
          {phase === 'SHOWDOWN' && '패 공개 중...'}
          {phase === 'RESULT' && '게임 종료'}
        </div>

        {phase === 'RESULT' && isHost && (
          <div className="flex flex-col items-center gap-2 anim-fade-up mt-2">
            <Button onClick={() => startNextRound()} size="lg">
              다음 판 시작
            </Button>
            <span className="text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
              (10초 후 자동 시작)
            </span>
          </div>
        )}

        {/* Selection status */}
        {selectedCardIds.length > 0 && (
          <div
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full"
            style={{
              fontFamily: 'var(--font-serif)',
              background: canConfirm ? 'rgba(127,176,105,0.2)' : 'rgba(200,169,110,0.1)',
              color: canConfirm ? '#7fb069' : 'var(--tujeon-gold)',
              border: `1px solid ${canConfirm ? 'rgba(127,176,105,0.3)' : 'rgba(200,169,110,0.15)'}`,
            }}
          >
            {canConfirm
              ? `✓ 합: ${selectedSum} — 집 짓기 가능!`
              : `선택: ${selectedCardIds.length}/3 · 합: ${selectedSum}`
            }
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full px-4 sm:px-0 sm:w-auto">
          {phase === 'MAKE_COMBINATION' && (
            <>
              <Button onClick={handleConfirm} disabled={!canConfirm} size="lg">
                집 짓기 확인
              </Button>
              <Button onClick={() => setIsHwangModalOpen(true)} variant="secondary" size="lg">
                황 선언
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── My Hand (bottom) ── */}
      <div className="mb-2 sm:mb-4 w-full max-w-lg relative">
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
          <div className="glass-panel px-3 sm:px-5 py-2 sm:py-3 flex items-center gap-3 mb-2 justify-center">
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
              {myInfo.name}
            </span>
          </div>
        )}

        <div className="flex items-end justify-center gap-1 sm:gap-2 flex-wrap">
          {parsedCards.map((card, idx) => (
            <CardComponent
              key={card.id}
              card={card}
              isFaceUp={true}
              isSelected={selectedCardIds.includes(card.id)}
              isDisabled={phase !== 'MAKE_COMBINATION'}
              onClick={() => toggleSelection(card.id)}
              dealDelay={idx * 100}
              size="md"
            />
          ))}
        </div>
      </div>

      {/* Hwang Modal */}
      <Modal isOpen={isHwangModalOpen} onClose={() => setIsHwangModalOpen(false)} title="황 선언">
        <p className="mb-4 sm:mb-6 text-sm sm:text-lg" style={{ color: 'var(--tujeon-cream)' }}>
          정말 10을 만들 조합이 없습니까?<br/>
          <span style={{ color: 'var(--tujeon-red)' }}>황을 선언하면 이번 라운드에서 패배합니다.</span>
        </p>
        <div className="flex gap-3 sm:gap-4 justify-end">
          <Button variant="secondary" onClick={() => setIsHwangModalOpen(false)}>취소</Button>
          <Button onClick={() => { setIsHwangModalOpen(false); }}>선언하기</Button>
        </div>
      </Modal>
    </div>
  );
}
