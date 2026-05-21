'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO, CardSuit } from '@/types/game';
import { calculateJokbo } from '@/logic/engine/dolryeodaegi';
import CardComponent from '../game/CardComponent';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import RuleHelper from '../game/RuleHelper';
import VictoryEffect from '@/components/ui/VictoryEffect';

export default function MultiplayGameBoard() {
  const router = useRouter();
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
  const myCards = privateHand as string[];
  const myInfo = myId ? publicPlayers[myId] : null;

  const { leftId, topId, rightId } = useMemo(() => {
    const uids = Object.keys(publicPlayers).sort();
    if (uids.length < 2 || !myId) return { leftId: '', topId: '', rightId: '' };
    const myIndex = uids.indexOf(myId);
    if (uids.length === 2) return { leftId: '', topId: uids[(myIndex + 1) % 2], rightId: '' };
    if (uids.length === 3) return { leftId: uids[(myIndex + 1) % 3], topId: '', rightId: uids[(myIndex + 2) % 3] };
    return { leftId: uids[(myIndex + 1) % 4], topId: uids[(myIndex + 2) % 4], rightId: uids[(myIndex + 3) % 4] };
  }, [publicPlayers, myId]);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isHwangConfirmOpen, setIsHwangConfirmOpen] = useState(false);
  const [showRuleHelper, setShowRuleHelper] = useState(false);

  const parsedCards = useMemo(() => {
    return myCards.map((cardId) => {
      const parts = cardId.split('_');
      if (parts.length !== 2) return null;
      const suit = parts[0] as Card['suit'];
      const rank = parseInt(parts[1], 10);
      if (!SUIT_INFO[suit]) return null;
      return { id: cardId, suit, rank, imageUrl: '' } as Card;
    }).filter(Boolean) as Card[];
  }, [myCards]);

  const selectedSum = useMemo(() => {
    return parsedCards
      .filter((c) => selectedCardIds.includes(c.id))
      .reduce((acc, c) => acc + c.rank, 0);
  }, [parsedCards, selectedCardIds]);

  const canConfirm = selectedCardIds.length === 3 && selectedSum % 10 === 0;

  const selectionOrder = useMemo(() => {
    const order: Record<string, number> = {};
    selectedCardIds.forEach((id, idx) => { order[id] = idx + 1; });
    return order;
  }, [selectedCardIds]);

  const toggleSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length < 3) return [...prev, cardId];
      return prev;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || !myId) return;
    await updateGameState({ [`confirmed_${myId}`]: selectedCardIds.join(',') } as any);
  }, [canConfirm, myId, selectedCardIds, updateGameState]);

  const handleConfirmHwang = useCallback(async () => {
    if (!myId) return;
    await updateGameState({ [`confirmed_${myId}`]: 'HWANG' } as any);
    setIsHwangConfirmOpen(false);
  }, [myId, updateGameState]);

  // scheduledBotsRef to prevent redundant setTimeout loops
  const scheduledBotsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (phase !== 'MAKE_COMBINATION') {
      scheduledBotsRef.current.clear();
    }
  }, [phase]);

  // Host auto-plays for bots
  React.useEffect(() => {
    if (!isHost || phase !== 'MAKE_COMBINATION') return;
    const bots = Object.entries(publicPlayers).filter(
      ([uid, info]) => info.isBot && !(gameState as any)?.[`confirmed_${uid}`] && !scheduledBotsRef.current.has(uid)
    );
    if (bots.length === 0) return;

    bots.forEach(([botId]) => {
      scheduledBotsRef.current.add(botId);
      setTimeout(async () => {
        const { getFirebaseDb } = await import('@/lib/firebase');
        const { ref, get: firebaseGet } = await import('firebase/database');
        const db = getFirebaseDb();
        const roomId = useMultiplayStore.getState().roomId;
        if (!roomId) return;
        const botHandSnap = await firebaseGet(ref(db, `rooms/${roomId}/privatePlayers/${botId}/hand`));
        if (!botHandSnap.exists()) return;
        const hand: string[] = botHandSnap.val();
        const parsed = hand.map((cardId) => ({ id: cardId, rank: parseInt(cardId.split('_')[1], 10) }));
        let bestSelection: string[] = [];
        let found = false;
        for (let i = 0; i < parsed.length - 2; i++) {
          for (let j = i + 1; j < parsed.length - 1; j++) {
            for (let k = j + 1; k < parsed.length; k++) {
              if ((parsed[i].rank + parsed[j].rank + parsed[k].rank) % 10 === 0) {
                bestSelection = [parsed[i].id, parsed[j].id, parsed[k].id];
                found = true; break;
              }
            }
            if (found) break;
          }
          if (found) break;
        }
        if (!found) bestSelection = hand.slice(0, 3);
        await updateGameState({ [`confirmed_${botId}`]: bestSelection.join(',') } as any);
      }, 1500 + Math.random() * 2000);
    });
  }, [isHost, phase, gameState, publicPlayers, updateGameState]);

  React.useEffect(() => {
    if (!isHost || phase !== 'MAKE_COMBINATION') return;
    const allPlayers = Object.keys(publicPlayers);
    if (allPlayers.length === 0) return;
    const allConfirmed = allPlayers.every(uid => (gameState as any)?.[`confirmed_${uid}`]);
    if (allConfirmed) updateGameState({ phase: 'SHOWDOWN' } as any);
  }, [isHost, phase, gameState, publicPlayers, updateGameState]);

  React.useEffect(() => {
    if (!isHost || phase !== 'SHOWDOWN') return;
    const timer = setTimeout(() => {
      useMultiplayStore.getState().evaluateDolryeodaegiShowdown?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [isHost, phase]);

  React.useEffect(() => {
    if (isHost && phase === 'RESULT') {
      const timer = setTimeout(() => startNextRound(), 10000);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, startNextRound]);

  const handleLeave = () => {
    useMultiplayStore.getState().leaveRoom();
    router.push('/');
  };

  const phaseLabels: Record<string, string> = {
    MAKE_COMBINATION: '집 짓기',
    PLAYER_ACTION: '카드 선택',
    SHOWDOWN: '패 공개',
    RESULT: '결과',
    DEAL: '카드 배분',
    LOBBY: '대기 중',
  };

  const myConfirmedVal = myId ? (gameState as any)?.[`confirmed_${myId}`] as string | undefined : undefined;
  const isMyHwang = myConfirmedVal === 'HWANG';
  const myConfirmedCardIds = useMemo(() => {
    return myConfirmedVal && myConfirmedVal !== 'HWANG' ? myConfirmedVal.split(',') : [];
  }, [myConfirmedVal]);

  const myJokboResult = useMemo(() => {
    if (parsedCards.length !== 5) return null;
    if (isMyHwang) {
      return { label: '황', isHwang: true };
    }
    if (myConfirmedCardIds.length === 3) {
      const combo3 = parsedCards.filter(c => myConfirmedCardIds.includes(c.id));
      const remaining2 = parsedCards.filter(c => !myConfirmedCardIds.includes(c.id));
      const sum3 = combo3.reduce((acc, c) => acc + c.rank, 0);
      if (sum3 % 10 === 0 && remaining2.length === 2) {
        const jokbo = calculateJokbo(remaining2[0], remaining2[1]);
        return { label: jokbo.jokboLabel, isHwang: false };
      }
    }
    return { label: '황', isHwang: true };
  }, [parsedCards, isMyHwang, myConfirmedCardIds]);

  const sortedMyCards = useMemo(() => {
    if (phase !== 'SHOWDOWN' && phase !== 'RESULT') return parsedCards;
    if (isMyHwang) return parsedCards;
    const houseCards = parsedCards.filter(c => myConfirmedCardIds.includes(c.id));
    const remainingCards = parsedCards.filter(c => !myConfirmedCardIds.includes(c.id));
    return [...houseCards, ...remainingCards];
  }, [parsedCards, myConfirmedCardIds, isMyHwang, phase]);

  const mySelectionOrder = useMemo(() => {
    const order: Record<string, number> = {};
    if (phase === 'SHOWDOWN' || phase === 'RESULT') {
      myConfirmedCardIds.forEach((id, idx) => { order[id] = idx + 1; });
    } else {
      selectedCardIds.forEach((id, idx) => { order[id] = idx + 1; });
    }
    return order;
  }, [selectedCardIds, myConfirmedCardIds, phase]);

  const OpponentInfo = ({ uid }: { uid: string }) => {
    const info = publicPlayers[uid];
    if (!info) return null;
    const isConfirmed = (gameState as any)?.[`confirmed_${uid}`];
    const showdownCards = (gameState as any)?.showdownHands?.[uid] as string[] | undefined;
    const isShowdown = phase === 'SHOWDOWN' || phase === 'RESULT';

    const opponentCards = useMemo(() => {
      if (!showdownCards) return [];
      return showdownCards.map(cardId => {
        const parts = cardId.split('_');
        const suit = parts[0] as Card['suit'];
        const rank = parseInt(parts[1], 10);
        return { id: cardId, suit, rank, imageUrl: '' } as Card;
      });
    }, [showdownCards]);

    const confirmedVal = (gameState as any)?.[`confirmed_${uid}`] as string | undefined;
    const isHwang = confirmedVal === 'HWANG';
    const confirmedCardIds = useMemo(() => {
      return confirmedVal && confirmedVal !== 'HWANG' ? confirmedVal.split(',') : [];
    }, [confirmedVal]);

    const jokboResult = useMemo(() => {
      if (opponentCards.length !== 5) return null;
      if (isHwang) {
        return { label: '황', isHwang: true };
      }
      if (confirmedCardIds.length === 3) {
        const combo3 = opponentCards.filter(c => confirmedCardIds.includes(c.id));
        const remaining2 = opponentCards.filter(c => !confirmedCardIds.includes(c.id));
        const sum3 = combo3.reduce((acc, c) => acc + c.rank, 0);
        if (sum3 % 10 === 0 && remaining2.length === 2) {
          const jokbo = calculateJokbo(remaining2[0], remaining2[1]);
          return { label: jokbo.jokboLabel, isHwang: false };
        }
      }
      return { label: '황', isHwang: true };
    }, [opponentCards, isHwang, confirmedCardIds]);

    const sortedOpponentCards = useMemo(() => {
      if (opponentCards.length !== 5) return opponentCards;
      if (isHwang) return opponentCards;
      const houseCards = opponentCards.filter(c => confirmedCardIds.includes(c.id));
      const remainingCards = opponentCards.filter(c => !confirmedCardIds.includes(c.id));
      return [...houseCards, ...remainingCards];
    }, [opponentCards, confirmedCardIds, isHwang]);

    return (
      <div className="ink-panel px-3 py-2 flex flex-col gap-2 min-w-[200px] max-w-[280px]">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
              color: 'var(--tujeon-cream)',
            }}
          >
            {info.isBot ? '봇' : '상대'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-xs font-bold truncate" style={{ color: 'var(--tujeon-cream)' }}>
              {info.name}
            </span>
            <span className="text-[8px] sm:text-[9px]" style={{ color: 'var(--tujeon-cream-dim)' }}>
              {info.cardCount}장
              {isConfirmed && !isShowdown && <span style={{ color: '#7fb069' }}> · 준비 ✓</span>}
            </span>
          </div>
          {info.isOnline !== undefined && (
            <div
              className="w-1.5 h-1.5 rounded-full ml-auto"
              style={{ background: info.isOnline ? '#7fb069' : '#666' }}
            />
          )}
        </div>

        {isShowdown && sortedOpponentCards.length > 0 && (
          <div className="flex flex-col gap-2.5 mt-3.5 border-t border-[rgba(200,169,110,0.1)] pt-3 items-center">
            <div className="flex items-center gap-0.5 justify-center">
              {sortedOpponentCards.map((card, idx) => {
                const isHouseCard = confirmedCardIds.includes(card.id);
                return (
                  <React.Fragment key={card.id}>
                    {idx === 3 && !isHwang && (
                      <div className="w-[1px] h-6 bg-[rgba(200,169,110,0.3)] mx-1 self-center" />
                    )}
                    <CardComponent
                      card={card}
                      isFaceUp={true}
                      isSelected={isHouseCard}
                      isDisabled={true}
                      size="xs"
                      selectionIndex={isHouseCard ? idx + 1 : undefined}
                    />
                  </React.Fragment>
                );
              })}
            </div>
            {jokboResult && (
              <div
                className="text-[9px] px-2 py-0.5 rounded font-bold mt-1 shadow-sm animate-fade-in"
                style={{
                  fontFamily: 'var(--font-serif)',
                  background: jokboResult.isHwang 
                    ? 'rgba(184, 92, 92, 0.15)' 
                    : 'linear-gradient(135deg, rgba(200,169,110,0.2) 0%, rgba(200,169,110,0.05) 100%)',
                  color: jokboResult.isHwang ? 'var(--tujeon-red-light)' : 'var(--tujeon-gold)',
                  border: `1px solid ${jokboResult.isHwang ? 'rgba(184, 92, 92, 0.3)' : 'rgba(200,169,110,0.25)'}`,
                }}
              >
                {jokboResult.label}
              </div>
            )}
          </div>
        )}
      </div>
    );
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
          <span style={{ fontFamily: 'var(--font-serif)' }}>돌려대기</span>
          <span className="status-bar-value">{phaseLabels[phase] || phase}</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowRuleHelper(true)} className="status-bar-back" aria-label="규칙" style={{ fontSize: '0.9rem' }}>?</button>
      </div>

      {/* ── Opponents (top area) ── */}
      <div className="pt-[calc(44px+env(safe-area-inset-top)+8px)] px-2 sm:px-4 flex justify-center gap-2 sm:gap-3 flex-wrap">
        {leftId && <OpponentInfo uid={leftId} />}
        {topId && <OpponentInfo uid={topId} />}
        {rightId && <OpponentInfo uid={rightId} />}
      </div>

      {/* ── Center Area ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 min-h-[120px]">
        <div
          className="text-sm sm:text-base font-bold text-center anim-phase-in"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
          key={phase}
        >
          {phase === 'MAKE_COMBINATION' && '3장을 골라 집을 지으세요'}
          {phase === 'PLAYER_ACTION' && '카드를 선택하세요'}
          {phase === 'SHOWDOWN' && '패 공개 중...'}
        </div>
        {selectedCardIds.length > 0 && phase === 'MAKE_COMBINATION' && (
          <div
            className="text-xs px-3 py-1 rounded-full animate-fade-in"
            style={{
              fontFamily: 'var(--font-serif)',
              background: canConfirm ? 'rgba(127,176,105,0.2)' : 'rgba(200,169,110,0.1)',
              color: canConfirm ? '#7fb069' : 'var(--tujeon-gold)',
              border: `1px solid ${canConfirm ? 'rgba(127,176,105,0.3)' : 'rgba(200,169,110,0.15)'}`,
            }}
          >
            {canConfirm ? `✓ 합: ${selectedSum} — 집 짓기 가능!` : `선택: ${selectedCardIds.length}/3 · 합: ${selectedSum}`}
          </div>
        )}
        {phase === 'RESULT' && (
          <div className="flex flex-col items-center gap-2 animate-fade-in">
            <div className="text-xl sm:text-2xl font-black" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
              {gameState?.winnerId === 'DRAW' ? '무승부' : gameState?.winnerId === myId ? '승리!' : '패배'}
            </div>
            {myJokboResult && (
              <div className="flex items-center gap-1.5 mt-1 text-xs animate-fade-in" style={{ color: 'var(--tujeon-cream-dim)' }}>
                내 족보: 
                <span 
                  className="px-2.5 py-0.5 rounded font-bold shadow-sm"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    background: myJokboResult.isHwang 
                      ? 'rgba(184, 92, 92, 0.2)' 
                      : 'linear-gradient(135deg, rgba(200,169,110,0.3) 0%, rgba(200,169,110,0.1) 100%)',
                    color: myJokboResult.isHwang ? 'var(--tujeon-red-light)' : 'var(--tujeon-gold)',
                    border: `1px solid ${myJokboResult.isHwang ? 'rgba(184, 92, 92, 0.4)' : 'rgba(200,169,110,0.35)'}`,
                  }}
                >
                  {myJokboResult.label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── My Hand (bottom) ── */}
      <div className="px-3 sm:px-6 pb-3 relative z-10">
        {myInfo && (
          <div className="ink-panel px-3 py-1.5 flex items-center gap-2 mb-6 justify-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-dim))',
                color: 'var(--tujeon-black)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              나
            </div>
            <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-cream)' }}>
              {myInfo.name}
            </span>
          </div>
        )}
        <div className="card-fan flex items-end justify-center gap-1 sm:gap-2 flex-wrap">
          {sortedMyCards.map((card, idx) => {
            const isSelected = phase === 'SHOWDOWN' || phase === 'RESULT'
              ? myConfirmedCardIds.includes(card.id)
              : selectedCardIds.includes(card.id);
            const isSeparator = (phase === 'SHOWDOWN' || phase === 'RESULT') && idx === 3 && !isMyHwang;
            
            return (
              <React.Fragment key={card.id}>
                {isSeparator && (
                  <div className="w-[2px] h-20 bg-[rgba(200,169,110,0.4)] mx-2 self-center rounded-full" />
                )}
                <CardComponent
                  card={card}
                  isFaceUp={true}
                  isSelected={isSelected}
                  isDisabled={phase !== 'MAKE_COMBINATION'}
                  onClick={() => toggleSelection(card.id)}
                  dealDelay={idx * 100}
                  size="md"
                  selectionIndex={mySelectionOrder[card.id]}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Action Dock ── */}
      {(phase === 'MAKE_COMBINATION' || phase === 'SHOWDOWN') && (
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
                  onClick={handleConfirmHwang}
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
                disabled={phase === 'SHOWDOWN' || !canConfirm}
                size="md"
                className="flex-1 max-w-[200px]"
              >
                {phase === 'SHOWDOWN' ? '패 공개 중...' : '집 짓기 확인'}
              </Button>
              <Button
                onClick={() => setIsHwangConfirmOpen(true)}
                disabled={phase === 'SHOWDOWN'}
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

      {phase === 'RESULT' && isHost && (
        <div className="action-dock">
          <Button onClick={() => startNextRound()} size="md" className="flex-1 max-w-[180px]">
            다음 판 시작
          </Button>
          <span className="text-[10px]" style={{ color: 'var(--tujeon-cream-dim)' }}>(10초 후 자동 시작)</span>
        </div>
      )}

      {/* Spacer for action dock - stable and permanent */}
      <div style={{ height: 'calc(68px + env(safe-area-inset-bottom))' }} />



      <RuleHelper isOpen={showRuleHelper} onClose={() => setShowRuleHelper(false)} />
    </div>
  );
}
