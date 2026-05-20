'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore, RoomConfig } from '@/logic/useMultiplayStore';
import { getFirebaseDb } from '@/lib/firebase';
import { ref, update, get as firebaseGet } from 'firebase/database';
import { createDeck, shuffleDeck, dealFromDeck } from '@/data/deck';
import { GAME_MODE_INFO, GameMode } from '@/types/game';
import Button from '@/components/ui/Button';
import PlayerList from './PlayerList';
import { getErrorMessage } from '@/lib/error';

type LobbyStep = 'MENU' | 'CREATE' | 'JOIN' | 'MATCHING' | 'WAITING';

interface MultiplayLobbyProps {
  onBack?: () => void;
}

export default function MultiplayLobby({ onBack }: MultiplayLobbyProps = {}) {
  const router = useRouter();
  const {
    myId,
    roomId,
    isHost,
    isMatchmaking,
    roomConfig,
    gameState,
    publicPlayers,
    login,
    createRoom,
    joinRoom,
    findMatch,
    leaveRoom,
    dealCardsToPlayers,
    updateGameState,
  } = useMultiplayStore();

  const [step, setStep] = useState<LobbyStep>('MENU');
  const [selectedMode, setSelectedMode] = useState<GameMode>('GAGU');
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState<number>(4);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Create Room ──
  const handleCreateRoom = useCallback(async () => {
    const finalName = playerName.trim() || '익명의 투전자';
    setLoading(true);
    setError('');
    try {
      const config: RoomConfig = {
        gameMode: selectedMode,
        maxPlayers: selectedMode === 'GAGU' ? 2 : selectedMaxPlayers,
      };
      const newRoomId = await createRoom(config, finalName);
      setStep('WAITING');
      
      // Auto-copy the room code
      try {
        await navigator.clipboard.writeText(newRoomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        console.error('Failed to copy room code', err);
      }
    } catch (e: any) {
      setError(getErrorMessage(e, '방 생성에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [playerName, selectedMode, createRoom]);

  // ── Join Room ──
  const handleJoinRoom = useCallback(async () => {
    if (!joinCode.trim()) {
      setError('방 코드를 입력해 주세요.');
      return;
    }
    const finalName = playerName.trim() || '익명의 투전자';
    setLoading(true);
    setError('');
    try {
      const formattedCode = joinCode.trim().toUpperCase();
      await joinRoom(formattedCode, finalName);
      setStep('WAITING');
    } catch (e: any) {
      setError(getErrorMessage(e, '방 입장에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [playerName, joinCode, joinRoom]);

  // ── Start Game (Host only) ──
  const handleStartGame = useCallback(async () => {
    if (!isHost || !roomConfig) return;
    
    const db = getFirebaseDb();
    const currentUids = Object.keys(publicPlayers);
    const botsToGenerate = roomConfig.maxPlayers - currentUids.length;
    
    // Generate bots if room is not full
    if (botsToGenerate > 0) {
      const updates: Record<string, any> = {};
      for (let i = 0; i < botsToGenerate; i++) {
        const botId = `bot_${Date.now()}_${i}`;
        currentUids.push(botId);
        updates[`rooms/${roomId}/publicPlayers/${botId}`] = {
          name: `투전 봇 ${i + 1}`,
          cardCount: 0,
          score: 0,
          isOnline: true,
          isBot: true,
        };
      }
      await update(ref(db), updates);
    }

    // Determine the number of cards per player
    let numCards = 2; // Default for GAGU
    if (roomConfig.gameMode === 'SUTUJEON') numCards = 20;
    else if (roomConfig.gameMode === 'DOLRYEO_DAEGI') numCards = 5;

    // Create and shuffle deck (Sutujeon uses 80 cards, others 40)
    let deck = shuffleDeck(createDeck(roomConfig.gameMode === 'SUTUJEON' ? 80 : 40));
    const playersHands: Record<string, string[]> = {};

    // Deal cards to each player in the room (including bots)
    const gaguStatus: Record<string, { hasStood: boolean; score: number }> = {};
    currentUids.forEach((uid) => {
      const { dealt, remaining } = dealFromDeck(deck, numCards);
      deck = remaining;
      playersHands[uid] = dealt.map(c => c.id);
      
      const scoreSum = dealt.reduce((acc, c) => acc + c.rank, 0);
      gaguStatus[uid] = { hasStood: false, score: scoreSum % 10 };
    });

    // Save hands and update phase to PLAYER_ACTION
    await dealCardsToPlayers({
      playersHands,
      deck: deck.map(c => c.id),
      gaguStatus
    });

    // Navigate to the game page with multiplay flag
    router.push(`/game?mode=${roomConfig.gameMode}&multiplay=true`);
  }, [isHost, roomConfig, publicPlayers, dealCardsToPlayers, router]);

  // ── Leave ──
  const handleLeave = useCallback(() => {
    leaveRoom();
    setStep('MENU');
    setError('');
  }, [leaveRoom]);

  // ── Quick Match ──
  const handleQuickMatch = useCallback(async () => {
    const finalName = playerName.trim() || '익명의 투전자';
    setLoading(true);
    setError('');
    setStep('MATCHING');
    try {
      await findMatch(selectedMode, finalName);
      setStep('WAITING');
    } catch (e: any) {
      setError(getErrorMessage(e, '매칭에 실패했습니다.'));
      setStep('MENU');
    } finally {
      setLoading(false);
    }
  }, [playerName, selectedMode, findMatch]);

  const playerCount = Object.keys(publicPlayers).length;

  // ── Navigate to game if phase changes away from LOBBY ──
  if (gameState && gameState.phase !== 'LOBBY' && roomConfig && step === 'WAITING') {
    router.push(`/game?mode=${roomConfig.gameMode}&multiplay=true`);
  }

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(58,90,140,0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, rgba(200,169,110,0.06) 0%, transparent 50%),
            var(--tujeon-bg-deep)
          `,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        {/* Title */}
        <div className="text-center anim-fade-up">
          <h1
            className="text-3xl sm:text-4xl font-black mb-1"
            style={{
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(135deg, var(--tujeon-gold-light), var(--tujeon-gold))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            멀티플레이
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
            친구와 실시간 대전
          </p>
        </div>

        {/* ── MENU Step ── */}
        {step === 'MENU' && (
          <div className="flex flex-col gap-3 w-full anim-fade-up">

            {/* ── Quick Match Section ── */}
            <div className="ink-panel p-4 flex flex-col gap-3">
              <div className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                닉네임 (선택)
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="익명의 투전자"
                maxLength={10}
                className="ink-panel px-4 py-2.5 text-sm bg-transparent outline-none w-full"
                style={{ color: 'var(--tujeon-cream)', borderColor: 'rgba(200,169,110,0.15)' }}
              />
              <div className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                게임 모드
              </div>
              <div className="flex gap-2">
                {(['DOLRYEO_DAEGI', 'GAGU', 'SUTUJEON'] as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`ink-panel flex-1 px-2 py-2 text-xs sm:text-sm text-center transition-all ${
                      mode === selectedMode ? 'ring-1 ring-yellow-600/40 scale-[1.02]' : 'opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
                    onClick={() => setSelectedMode(mode)}
                  >
                    {GAME_MODE_INFO[mode].label}
                  </button>
                ))}
              </div>
              <Button size="lg" onClick={handleQuickMatch} className="w-full">
                ⚡ 빠른 매칭
              </Button>
              <p className="text-[10px] text-center" style={{ color: 'var(--tujeon-cream-dim)' }}>
                열린 방이 있으면 자동 입장, 없으면 새 방 생성
              </p>
            </div>

            {/* ── Separator ── */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: 'rgba(200,169,110,0.15)' }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--tujeon-gold-dim)' }}>또는</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(200,169,110,0.15)' }} />
            </div>

            {/* ── Manual Options ── */}
            <Button size="md" variant="secondary" onClick={() => setStep('CREATE')} className="w-full">
              방 만들기
            </Button>
            <Button size="md" variant="secondary" onClick={() => setStep('JOIN')} className="w-full">
              방 코드로 참가
            </Button>
            <button
              onClick={handleBack}
              className="text-sm mt-2 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--tujeon-cream-dim)', fontFamily: 'var(--font-serif)' }}
            >
              ← 홈으로
            </button>
          </div>
        )}

        {/* ── CREATE Step ── */}
        {step === 'CREATE' && (
          <div className="flex flex-col gap-4 w-full anim-fade-up">
            {/* Nickname */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                닉네임
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="이름을 입력하세요"
                maxLength={10}
                className="ink-panel px-4 py-3 text-sm bg-transparent outline-none w-full"
                style={{ color: 'var(--tujeon-cream)', borderColor: 'rgba(200,169,110,0.15)' }}
              />
            </div>

            {/* Game Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                게임 모드
              </label>
              <div className="flex gap-2">
                {(['DOLRYEO_DAEGI', 'GAGU', 'SUTUJEON'] as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`ink-panel flex-1 px-3 py-2.5 text-sm text-center transition-all ${
                      mode === selectedMode ? 'ring-1 ring-yellow-600/40 scale-[1.02]' : 'opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
                    onClick={() => setSelectedMode(mode)}
                  >
                    {GAME_MODE_INFO[mode].label}
                  </button>
                ))}
              </div>
            </div>

            {selectedMode !== 'GAGU' && (
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                  최대 인원
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      className={`ink-panel flex-1 px-3 py-2.5 text-sm text-center transition-all ${
                        selectedMaxPlayers === num ? 'ring-1 ring-yellow-600/40 scale-[1.02]' : 'opacity-60'
                      }`}
                      style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
                      onClick={() => setSelectedMaxPlayers(num)}
                    >
                      {num}명
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-center" style={{ color: 'var(--tujeon-red-light)' }}>{error}</div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setStep('MENU'); setError(''); }} className="flex-1">
                뒤로
              </Button>
              <Button onClick={handleCreateRoom} disabled={loading} className="flex-1">
                {loading ? '생성 중...' : '방 만들기'}
              </Button>
            </div>
          </div>
        )}

        {/* ── JOIN Step ── */}
        {step === 'JOIN' && (
          <div className="flex flex-col gap-4 w-full anim-fade-up">
            {/* Nickname */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                닉네임
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="이름을 입력하세요"
                maxLength={10}
                className="ink-panel px-4 py-3 text-sm bg-transparent outline-none w-full"
                style={{ color: 'var(--tujeon-cream)', borderColor: 'rgba(200,169,110,0.15)' }}
              />
            </div>

            {/* Room Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                방 코드
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="방 코드를 입력하세요"
                maxLength={6}
                className="ink-panel px-4 py-3 text-sm bg-transparent outline-none font-mono tracking-widest uppercase w-full text-center"
                style={{ color: 'var(--tujeon-cream)', borderColor: 'rgba(200,169,110,0.15)' }}
              />
            </div>

            {error && (
              <div className="text-xs text-center" style={{ color: 'var(--tujeon-red-light)' }}>{error}</div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setStep('MENU'); setError(''); }} className="flex-1">
                뒤로
              </Button>
              <Button onClick={handleJoinRoom} disabled={loading} className="flex-1">
                {loading ? '입장 중...' : '참가하기'}
              </Button>
            </div>
          </div>
        )}

        {/* ── MATCHING Step ── */}
        {step === 'MATCHING' && (
          <div className="flex flex-col items-center gap-6 w-full anim-fade-up py-8">
            {/* Spinning indicator */}
            <div className="relative w-20 h-20">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: '3px solid rgba(200,169,110,0.15)',
                }}
              />
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: '3px solid transparent',
                  borderTopColor: 'var(--tujeon-gold)',
                  animationDuration: '1s',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>

            <div className="text-center">
              <div
                className="text-lg font-bold mb-1"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
              >
                매칭 중...
              </div>
              <p className="text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
                {GAME_MODE_INFO[selectedMode].label} 상대를 찾고 있습니다
              </p>
            </div>

            {error && (
              <div className="text-xs text-center" style={{ color: 'var(--tujeon-red-light)' }}>{error}</div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                leaveRoom();
                setStep('MENU');
                setLoading(false);
              }}
            >
              매칭 취소
            </Button>
          </div>
        )}

        {/* ── WAITING Step ── */}
        {step === 'WAITING' && (
          <div className="flex flex-col gap-5 w-full anim-fade-up">
            {/* Room Code Display */}
            <div className="ink-panel p-5 text-center">
              <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--tujeon-gold-dim)' }}>
                방 코드
              </div>
              <div
                onClick={() => {
                  if (roomId) {
                    navigator.clipboard.writeText(roomId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }
                }}
                className="text-2xl sm:text-3xl font-mono font-bold tracking-[0.3em] cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: 'var(--tujeon-gold-light)' }}
                title="클릭하여 복사"
              >
                {roomId || '---'}
              </div>
              <div className="text-[10px] mt-1.5 transition-colors" style={{ color: copied ? '#4ade80' : 'var(--tujeon-cream-dim)' }}>
                {copied ? '방 코드가 복사되었습니다!' : '이 코드를 상대방에게 전달하세요'}
              </div>
            </div>

            {/* Game mode info */}
            {roomConfig && (
              <div className="text-center text-xs" style={{ color: 'var(--tujeon-cream-dim)' }}>
                <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}>
                  {GAME_MODE_INFO[roomConfig.gameMode]?.label}
                </span>
                {' · '}
                최대 {roomConfig.maxPlayers}명
              </div>
            )}

            {/* Player List */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                참가자 ({playerCount}/{roomConfig?.maxPlayers || '?'})
              </div>
              <PlayerList
                players={publicPlayers}
                myId={myId}
                hostId={isHost ? myId : null}
              />
            </div>

            {/* Start / Leave */}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleLeave} className="flex-1">
                나가기
              </Button>
              {isHost && (
                <Button
                  onClick={handleStartGame}
                  className="flex-1"
                >
                  {playerCount < (roomConfig?.maxPlayers || 2) ? '봇 포함 시작' : '게임 시작'}
                </Button>
              )}
            </div>

            {!isHost && (
              <div className="text-center text-xs anim-pulse-glow inline-block mx-auto px-4 py-2 rounded-full ink-panel" style={{ color: 'var(--tujeon-gold)' }}>
                방장이 게임을 시작할 때까지 대기 중...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
