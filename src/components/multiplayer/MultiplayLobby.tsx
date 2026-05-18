'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayStore, RoomConfig } from '@/logic/useMultiplayStore';
import { GAME_MODE_INFO, GameMode } from '@/types/game';
import Button from '@/components/ui/Button';
import PlayerList from './PlayerList';

type LobbyStep = 'MENU' | 'CREATE' | 'JOIN' | 'WAITING';

interface MultiplayLobbyProps {
  onBack?: () => void;
}

export default function MultiplayLobby({ onBack }: MultiplayLobbyProps = {}) {
  const router = useRouter();
  const {
    myId,
    roomId,
    isHost,
    roomConfig,
    gameState,
    publicPlayers,
    login,
    createRoom,
    joinRoom,
    leaveRoom,
    dealCardsToPlayers,
    updateGameState,
  } = useMultiplayStore();

  const [step, setStep] = useState<LobbyStep>('MENU');
  const [selectedMode, setSelectedMode] = useState<GameMode>('GAGU');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Create Room ──
  const handleCreateRoom = useCallback(async () => {
    if (!playerName.trim()) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const config: RoomConfig = {
        gameMode: selectedMode,
        maxPlayers: selectedMode === 'SUTUJEON' ? 4 : 2,
      };
      await createRoom(config, playerName.trim());
      setStep('WAITING');
    } catch (e: any) {
      setError(e.message || '방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [playerName, selectedMode, createRoom]);

  // ── Join Room ──
  const handleJoinRoom = useCallback(async () => {
    if (!playerName.trim()) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    if (!joinCode.trim()) {
      setError('방 코드를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinRoom(joinCode.trim(), playerName.trim());
      setStep('WAITING');
    } catch (e: any) {
      setError(e.message || '방 입장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [playerName, joinCode, joinRoom]);

  // ── Start Game (Host only) ──
  const handleStartGame = useCallback(async () => {
    if (!isHost || !roomConfig) return;
    // For now, we just transition the phase.
    // The host would deal cards via the game engine and call dealCardsToPlayers.
    await updateGameState({ phase: 'DEAL' });

    // Navigate to the game page with multiplay flag
    router.push(`/game?mode=${roomConfig.gameMode}&multiplay=true`);
  }, [isHost, roomConfig, updateGameState, router]);

  // ── Leave ──
  const handleLeave = useCallback(() => {
    leaveRoom();
    setStep('MENU');
    setError('');
  }, [leaveRoom]);

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
            <Button size="lg" onClick={() => setStep('CREATE')} className="w-full">
              방 만들기
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setStep('JOIN')} className="w-full">
              방 참가하기
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
                className="glass-panel px-4 py-3 text-sm bg-transparent outline-none"
                style={{ color: 'var(--tujeon-cream)', borderColor: 'rgba(200,169,110,0.2)' }}
              />
            </div>

            {/* Game Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold" style={{ color: 'var(--tujeon-gold-dim)', fontFamily: 'var(--font-serif)' }}>
                게임 모드
              </label>
              <div className="flex gap-2">
                {(['DOLRYEO_DAEGI', 'GAGU'] as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`glass-panel flex-1 px-3 py-2.5 text-sm text-center transition-all ${
                      mode === selectedMode ? 'ring-1 ring-yellow-600/40' : 'opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
                    onClick={() => setSelectedMode(mode)}
                  >
                    {GAME_MODE_INFO[mode].label}
                  </button>
                ))}
              </div>
            </div>

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
                className="glass-panel px-4 py-3 text-sm bg-transparent outline-none"
                style={{ color: 'var(--tujeon-cream)', borderColor: 'rgba(200,169,110,0.2)' }}
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
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="방 코드를 입력하세요"
                className="glass-panel px-4 py-3 text-sm bg-transparent outline-none font-mono tracking-widest"
                style={{ color: 'var(--tujeon-cream)', borderColor: 'rgba(200,169,110,0.2)' }}
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

        {/* ── WAITING Step ── */}
        {step === 'WAITING' && (
          <div className="flex flex-col gap-5 w-full anim-fade-up">
            {/* Room Code Display */}
            <div className="glass-panel p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--tujeon-gold-dim)' }}>
                방 코드
              </div>
              <div
                className="text-2xl sm:text-3xl font-mono font-bold tracking-[0.3em] select-all"
                style={{ color: 'var(--tujeon-gold-light)' }}
              >
                {roomId?.slice(-8).toUpperCase() || '---'}
              </div>
              <div className="text-[10px] mt-1.5" style={{ color: 'var(--tujeon-cream-dim)' }}>
                이 코드를 상대방에게 전달하세요
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
                  disabled={playerCount < 2}
                  className="flex-1"
                >
                  게임 시작
                </Button>
              )}
            </div>

            {!isHost && (
              <div className="text-center text-xs anim-pulse-glow inline-block mx-auto px-4 py-2 rounded-full glass-panel" style={{ color: 'var(--tujeon-gold)' }}>
                방장이 게임을 시작할 때까지 대기 중...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
