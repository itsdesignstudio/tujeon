'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore } from '@/logic/useMultiplayStore';
import { Card, SUIT_INFO } from '@/types/game';
import { evaluateTrickWinner } from '@/logic/engine/sutujeon';
import CardComponent from '../game/CardComponent';
import SutujeonRuleHelper from '../game/SutujeonRuleHelper';
import { getFirebaseDb } from '@/lib/firebase';
import { ref, get as firebaseGet, update } from 'firebase/database';
import Button from '@/components/ui/Button';
import VictoryEffect from '@/components/ui/VictoryEffect';
import Modal from '@/components/ui/Modal';

type SortMethod = 'SUIT' | 'RANK';

export default function MultiplaySutujeonBoard() {
  const router = useRouter();
  const {
    myId, gameState, publicPlayers, privateHand, isHost,
    playCardSutujeon, evaluateSutujeonTrick, startNextRound,
  } = useMultiplayStore();

  const [sortMethod, setSortMethod] = useState<SortMethod>('SUIT');
  const [showRuleHelper, setShowRuleHelper] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const phase = gameState?.phase || 'LOBBY';
  const isMyTurn = gameState?.currentTurn === myId;
  const myCards = privateHand as string[];
  const myInfo = myId ? publicPlayers[myId] : null;
  const trickActions = gameState?.sutujeonTrickActions || [];

  // ── Trick Winner Selection Logic ──
  const trickWinnerId = useMemo(() => {
    if (phase !== 'TRICK_EVAL' || trickActions.length < 4 || !gameState?.ledSuit) return null;
    try {
      const actionsForEngine = trickActions.map((act: any) => {
        const parts = act.cardId.split('_');
        const card: Card = {
          id: act.cardId,
          suit: parts[0] as Card['suit'],
          rank: parseInt(parts[1], 10),
          imageUrl: '',
        };
        return { playerId: act.playerId, card };
      });
      return evaluateTrickWinner({
        ledSuit: gameState.ledSuit as any,
        actions: actionsForEngine,
      });
    } catch (e) {
      return null;
    }
  }, [phase, trickActions, gameState?.ledSuit]);

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

  const parsedCards = useMemo(() => {
    return myCards.map((cardId) => {
      const parts = cardId.split('_');
      if (parts.length !== 2) return null;
      return { id: cardId, suit: parts[0] as Card['suit'], rank: parseInt(parts[1], 10), imageUrl: '' } as Card;
    }).filter(Boolean) as Card[];
  }, [myCards]);

  const sortedCards = useMemo(() => {
    return [...parsedCards].sort((a, b) => {
      if (sortMethod === 'SUIT') {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return b.rank - a.rank;
      }
      if (a.rank !== b.rank) return b.rank - a.rank;
      return a.suit.localeCompare(b.suit);
    });
  }, [parsedCards, sortMethod]);

  const hasLedSuit = useMemo(() => {
    if (!gameState?.ledSuit) return false;
    return parsedCards.some((c) => c.suit === gameState.ledSuit);
  }, [parsedCards, gameState?.ledSuit]);

  const canPlay = (card: Card) => {
    if (phase !== 'PLAYER_ACTION') return false;
    if (!isMyTurn) return false;
    if (gameState?.ledSuit && hasLedSuit) return card.suit === gameState.ledSuit;
    return true;
  };

  const handleCardClick = (card: Card) => {
    if (canPlay(card)) playCardSutujeon(card.id);
  };

  useEffect(() => { if (phase === 'RESULT') setShowResult(true); }, [phase]);

  useEffect(() => {
    if (isHost && phase === 'TRICK_EVAL') {
      const timer = setTimeout(() => evaluateSutujeonTrick(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, evaluateSutujeonTrick]);

  useEffect(() => {
    if (!isHost || phase !== 'PLAYER_ACTION' || !gameState?.currentTurn) return;
    const currentTurnInfo = publicPlayers[gameState.currentTurn];
    if (!currentTurnInfo?.isBot) return;
    const botId = gameState.currentTurn;
    const timer = setTimeout(async () => {
      const db = getFirebaseDb();
      const botHandSnap = await firebaseGet(ref(db, `rooms/${useMultiplayStore.getState().roomId}/privatePlayers/${botId}/hand`));
      if (!botHandSnap.exists()) return;
      const botHand: string[] = botHandSnap.val();
      let validCards = botHand;
      if (gameState.ledSuit) {
        const matching = botHand.filter(c => c.startsWith(gameState.ledSuit!));
        if (matching.length > 0) validCards = matching;
      }
      const selected = validCards[Math.floor(Math.random() * validCards.length)];
      if (!selected) return;
      const newHand = botHand.filter(c => c !== selected);
      const suit = selected.split('_')[0];
      const currentActions = gameState.sutujeonTrickActions || [];
      const newActions = [...currentActions, { playerId: botId, cardId: selected }];
      const players = Object.keys(publicPlayers).sort();
      const bIdx = players.indexOf(botId);
      const updates: Record<string, any> = {};
      const roomId = useMultiplayStore.getState().roomId;
      updates[`rooms/${roomId}/privatePlayers/${botId}/hand`] = newHand;
      updates[`rooms/${roomId}/publicPlayers/${botId}/cardCount`] = newHand.length;
      updates[`rooms/${roomId}/gameState/sutujeonTrickActions`] = newActions;
      if (currentActions.length === 0) updates[`rooms/${roomId}/gameState/ledSuit`] = suit;
      if (newActions.length === players.length) {
        updates[`rooms/${roomId}/gameState/currentTurn`] = null;
        await update(ref(db), updates);

        // Transition phase to TRICK_EVAL after 1000ms to allow card animation to settle
        setTimeout(async () => {
          const evalUpdates: Record<string, any> = {};
          evalUpdates[`rooms/${roomId}/gameState/phase`] = 'TRICK_EVAL';
          await update(ref(db), evalUpdates);
        }, 1000);
      } else {
        updates[`rooms/${roomId}/gameState/currentTurn`] = players[(bIdx + 1) % players.length];
        await update(ref(db), updates);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isHost, phase, gameState, publicPlayers]);

  useEffect(() => {
    if (isHost && phase === 'RESULT') {
      const timer = setTimeout(() => startNextRound(), 10000);
      return () => clearTimeout(timer);
    }
  }, [isHost, phase, startNextRound]);

  const handleLeave = () => {
    useMultiplayStore.getState().leaveRoom();
    router.push('/');
  };

  const totalTricksPlayed = gameState?.sutujeonTotalTricks || 0;
  const ledSuitLabel = gameState?.ledSuit ? SUIT_INFO[gameState.ledSuit as keyof typeof SUIT_INFO]?.label : null;

  const getResultType = () => {
    if (phase !== 'RESULT') return null;
    const sorted = Object.entries(publicPlayers).sort((a, b) => b[1].score - a[1].score);
    return sorted.length > 0 && sorted[0][0] === myId ? 'VICTORY' : 'DEFEAT';
  };

  const BotChip = ({ uid }: { uid: string }) => {
    const info = publicPlayers[uid];
    if (!info) return null;
    const isTurn = gameState?.currentTurn === uid;
    const isWinner = trickWinnerId === uid;
    return (
      <div className={`ink-panel px-2.5 py-1.5 flex items-center gap-2 relative transition-all duration-300 ${
        isTurn ? 'anim-turn-pulse ring-1 ring-yellow-600/30' : ''
      } ${
        isWinner ? 'ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] bg-yellow-950/20 scale-105' : ''
      }`}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 transition-colors"
          style={{
            background: isWinner
              ? 'linear-gradient(135deg, var(--tujeon-gold), var(--tujeon-gold-light))'
              : 'linear-gradient(135deg, var(--tujeon-blue), var(--tujeon-blue-light))',
            color: isWinner ? 'var(--tujeon-black)' : 'var(--tujeon-cream)'
          }}>
          {info.isBot ? '봇' : info.name.charAt(0)}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold truncate" style={{ color: 'var(--tujeon-cream)' }}>{info.name}</span>
          <span className="text-[8px]" style={{ color: 'var(--tujeon-cream-dim)' }}>{info.cardCount}장 · {info.score}수</span>
        </div>
        {info.isOnline !== undefined && !isWinner && (
          <div className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: info.isOnline ? '#7fb069' : '#666' }} />
        )}
        {isWinner && (
          <div className="absolute -top-3 -right-2 px-1.5 py-0.5 bg-yellow-500 text-black text-[8px] font-extrabold rounded-full animate-bounce shadow-md">
            🏆 +1
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="table-felt min-h-[100dvh] flex flex-col relative overflow-hidden">
      <VictoryEffect type={getResultType()} />

      {/* ── Status Bar ── */}
      <div className="status-bar relative flex items-center justify-between">
        {/* Left: Leave Button */}
        <button onClick={handleLeave} className="status-bar-back" aria-label="나가기">←</button>

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
            {isMyTurn ? '🎯 내 턴' : ''}
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
      <div className="pt-[calc(44px+env(safe-area-inset-top)+8px)] px-2 flex justify-center gap-2">
        {leftId && <BotChip uid={leftId} />}
        {topId && <BotChip uid={topId} />}
        {rightId && <BotChip uid={rightId} />}
      </div>

      {/* ── Trick Area ── */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(200,169,110,0.15)' }}>
          {trickActions.map((action: any) => {
            const parts = action.cardId.split('_');
            const card: Card = { id: action.cardId, suit: parts[0] as Card['suit'], rank: parseInt(parts[1], 10), imageUrl: '' };
            const pos = getTrickCardPosition(action.playerId, leftId, topId, rightId);
            const isWinningCard = trickWinnerId === action.playerId;
            const isEval = phase === 'TRICK_EVAL' && trickWinnerId;
            const targetPos = isEval
              ? getTrickCardPosition(trickWinnerId!, leftId, topId, rightId)
              : pos;

            return (
              <div
                key={action.cardId}
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
                  card={card}
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

      {/* ── My Hand ── */}
      <div className="px-2 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col items-center z-10 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center w-full mb-1.5 px-1">
          <div className="flex items-center gap-2">
            <span className={`ink-panel px-2 py-0.5 text-[10px] font-bold transition-all duration-300 ${
              isMyTurn ? 'anim-turn-pulse' : ''
            } ${
              trickWinnerId === myId ? 'ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] bg-yellow-950/20' : ''
            }`}
              style={{
                color: trickWinnerId === myId ? 'var(--tujeon-gold)' : isMyTurn ? 'var(--tujeon-gold)' : 'var(--tujeon-cream-dim)',
                fontFamily: 'var(--font-serif)'
              }}>
              내 패 · {myInfo?.score || 0}수
            </span>
            {trickWinnerId === myId && (
              <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[9px] font-extrabold rounded-full animate-bounce shadow-md">
                🏆 +1 수 획득!
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${sortMethod === 'SUIT' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-white/5 text-gray-400'}`}
              onClick={() => setSortMethod('SUIT')}>문양</button>
            <button className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${sortMethod === 'RANK' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-white/5 text-gray-400'}`}
              onClick={() => setSortMethod('RANK')}>숫자</button>
          </div>
        </div>
        <div className="card-hand-scroll w-full">
          <div className="card-hand-overlap mx-auto px-1">
            {sortedCards.map((card, idx) => (
              <CardComponent key={card.id} card={card} size="sm" isFaceUp={true} isDisabled={!canPlay(card)}
                onClick={() => handleCardClick(card)} dealDelay={idx * 25} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Result Modal ── */}
      <Modal isOpen={showResult && phase === 'RESULT'} onClose={() => setShowResult(false)} title="게임 종료" bottomSheet>
        <div className="space-y-2 mb-5">
          {Object.entries(publicPlayers).sort((a, b) => b[1].score - a[1].score).map(([uid, p], idx) => (
            <div key={uid} className="flex justify-between items-center py-2 px-3 rounded-lg"
              style={{ background: idx === 0 ? 'rgba(200,169,110,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-sm" style={{ color: uid === myId ? 'var(--tujeon-gold)' : 'var(--tujeon-cream)' }}>
                {idx === 0 && '👑'} {idx + 1}위 {p.name} {uid === myId && '(나)'}
              </span>
              <span className="font-bold" style={{ color: 'var(--tujeon-gold)', fontFamily: 'var(--font-serif)' }}>
                {p.score} 수
              </span>
            </div>
          ))}
        </div>
        {isHost && (
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setShowResult(false); startNextRound(); }} size="md">다음 판</Button>
          </div>
        )}
      </Modal>

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
