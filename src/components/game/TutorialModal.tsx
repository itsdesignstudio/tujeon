'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { GameMode, GAME_MODE_INFO } from '@/types/game';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_DATA: Record<GameMode, { title: string; icon: string; content: React.ReactNode }[]> = {
  DOLRYEO_DAEGI: [
    {
      title: '투전 패의 구성',
      icon: '🃏',
      content: (
        <div className="space-y-3">
          <p>투전은 <strong>40장</strong>의 패로 구성됩니다.</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {([
              { hanja: '人', label: '사람', color: 'var(--suit-person)' },
              { hanja: '魚', label: '물고기', color: 'var(--suit-fish)' },
              { hanja: '鳥', label: '새', color: 'var(--suit-bird)' },
              { hanja: '雉', label: '꿩', color: 'var(--suit-pheasant)' },
            ] as const).map((suit) => (
              <div
                key={suit.label}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: `${suit.color}15`, border: `1px solid ${suit.color}30` }}
              >
                <span className="text-2xl font-black" style={{ fontFamily: 'var(--font-serif)', color: suit.color }}>
                  {suit.hanja}
                </span>
                <span style={{ color: 'var(--tujeon-cream)' }}>{suit.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--tujeon-cream-dim)' }}>
            각 목(Suit)은 1~9와 장(10) = 총 10장으로 이루어져 있습니다.
          </p>
        </div>
      ),
    },
    {
      title: '돌려대기 — 집 짓기',
      icon: '🏠',
      content: (
        <div className="space-y-3">
          <p>5장의 패를 받으면, <strong>3장을 골라 합이 10의 배수</strong>가 되도록 만듭니다.</p>
          <div className="p-4 rounded-lg" style={{ background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.2)' }}>
            <p className="font-bold mb-2" style={{ color: 'var(--tujeon-gold)' }}>예시:</p>
            <p>3 + 4 + 3 = <strong>10</strong> ✓</p>
            <p>7 + 장(10) + 3 = <strong>20</strong> ✓</p>
            <p>2 + 5 + 6 = 13 ✗</p>
          </div>
          <p className="text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
            3장으로 10의 배수를 만들지 못하면 <strong>&quot;황&quot;</strong>이 되어 자동 패배합니다.
          </p>
        </div>
      ),
    },
    {
      title: '족보 — 남은 2장의 승부',
      icon: '⚔️',
      content: (
        <div className="space-y-3">
          <p>집을 지은 후, <strong>남은 2장</strong>으로 족보를 겨룹니다.</p>
          <div className="space-y-2 mt-3">
            {([
              { badge: 'jang-ttaeng', label: '장땡', desc: '장(10) + 장(10) — 최강' },
              { badge: 'ttaeng', label: '땡', desc: '같은 숫자 두 장 (9땡 > ... > 1땡)' },
              { badge: 'gabo', label: '가보', desc: '합의 끝자리가 9' },
              { badge: 'kkut', label: '끗', desc: '합의 끝자리 1~8 (8끗 > ... > 1끗)' },
              { badge: 'mang', label: '망', desc: '합의 끝자리가 0 — 최하' },
            ] as const).map((j) => (
              <div
                key={j.badge}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className={`jokbo-badge text-sm ${j.badge}`} style={{ minWidth: 70 }}>
                  {j.label}
                </div>
                <span className="text-sm" style={{ color: 'var(--tujeon-cream-dim)' }}>
                  {j.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ],
  GAGU: [
    {
      title: '가구 모드 규칙',
      icon: '🎲',
      content: (
        <div className="space-y-3">
          <p>바카라와 유사한 <strong>모듈로 10</strong> 점수 비교 게임입니다.</p>
          <div className="p-4 rounded-lg" style={{ background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.2)' }}>
            <ul className="space-y-2 text-sm">
              <li>• 처음 2장의 카드를 받습니다.</li>
              <li>• 모든 카드 숫자의 <strong>합의 끝자리(끗수)</strong>가 자신의 점수입니다.</li>
              <li>• 장(10)은 0점입니다.</li>
              <li>• 예: 8 + 7 = 15 ➔ <strong>5점</strong></li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: '가구 — 힛(Hit) 과 스탠드(Stand)',
      icon: '🎯',
      content: (
        <div className="space-y-3">
          <p>플레이어는 자유롭게 카드를 추가하거나 멈출 수 있습니다.</p>
          <div className="space-y-2 mt-3">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="font-bold text-green-400">한 장 더 받기 (Hit)</span>
              <p className="text-sm opacity-80">점수가 낮다면 최대 3장까지 카드를 더 받습니다.</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="font-bold text-yellow-400">여기서 멈춤 (Stand)</span>
              <p className="text-sm opacity-80">현재 점수에 만족한다면 멈추고 결과를 확인합니다.</p>
            </div>
            <div className="p-3 rounded-lg border border-red-500/30" style={{ background: 'rgba(255,0,0,0.05)' }}>
              <span className="font-bold text-red-400">딜러의 자동 행동</span>
              <p className="text-sm opacity-80">딜러는 5점 이하면 무조건 Hit, 6점 이상이면 Stand 합니다.</p>
            </div>
          </div>
        </div>
      ),
    },
  ],
  SUTUJEON: [
    {
      title: '수투전 기본 규칙',
      icon: '⚔️',
      content: (
        <div className="space-y-3">
          <p>4인이 겨루는 <strong>트릭테이킹</strong> 게임입니다.</p>
          <p className="text-sm opacity-90">8가지 문양, 총 80장의 확장 덱을 사용하며, 플레이어마다 20장씩 나눠 가집니다.</p>
          <div className="p-4 rounded-lg" style={{ background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.2)' }}>
            <ul className="space-y-2 text-sm">
              <li>• 총 20트릭(라운드)을 진행합니다.</li>
              <li>• 각 트릭마다 4명이 카드를 한 장씩 냅니다.</li>
              <li>• 규칙에 따라 가장 강한 카드를 낸 사람이 승리하여 1트릭을 따냅니다.</li>
              <li>• 최종적으로 <strong>가장 많은 트릭을 딴 사람이 최종 승리</strong>합니다.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: '주도 문양 (Led Suit)',
      icon: '👑',
      content: (
        <div className="space-y-3">
          <p>카드를 내는 가장 중요한 규칙인 <strong>주도 문양</strong>입니다.</p>
          <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ul className="space-y-3 text-sm">
              <li>
                <strong className="text-yellow-400">1. 선의 특권</strong><br/>
                가장 먼저 내는 카드(선)의 문양이 그 트릭의 <strong>주도 문양(Led Suit)</strong>이 됩니다.
              </li>
              <li>
                <strong className="text-green-400">2. 의무 (Must Follow Suit)</strong><br/>
                다른 플레이어들은 주도 문양과 같은 문양의 카드가 있다면 <strong>반드시</strong> 그 문양을 내야 합니다.
              </li>
              <li>
                <strong className="text-gray-400">3. 버리기 (Discard)</strong><br/>
                해당 문양이 아예 없다면 아무 카드나 버릴 수 있지만, 승리할 수는 없습니다.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: '문양별 파워 (High vs Low)',
      icon: '🔥',
      content: (
        <div className="space-y-3 text-sm">
          <p>카드의 파워는 문양의 <strong>종류</strong>에 따라 오름차순/내림차순이 다릅니다.</p>
          <p className="text-[10px] opacity-70">* 장(10)은 어떤 문양이든 무조건 최강입니다.</p>
          <div className="space-y-2 mt-2">
            <div className="p-2 rounded" style={{ background: 'rgba(200,169,110,0.15)' }}>
              <strong className="text-yellow-400">높을수록 승리 (사람, 물고기, 새, 꿩)</strong>
              <p className="text-xs font-mono mt-1 tracking-tighter opacity-80">장 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3 &gt; 2 &gt; 1</p>
            </div>
            <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <strong className="text-gray-300">낮을수록 승리 (별, 말, 사슴, 토끼)</strong>
              <p className="text-xs font-mono mt-1 tracking-tighter opacity-80">장 &gt; 1 &gt; 2 &gt; 3 &gt; 4 &gt; 5 &gt; 6 &gt; 7 &gt; 8 &gt; 9</p>
            </div>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: 'var(--tujeon-gold-dim)' }}>
            주도 문양과 일치하는 카드 중 가장 파워가 높은 카드가 승리합니다!
          </p>
        </div>
      ),
    },
  ]
};

export default function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [activeMode, setActiveMode] = useState<GameMode>('DOLRYEO_DAEGI');
  const [step, setStep] = useState(0);
  
  const currentSteps = TUTORIAL_DATA[activeMode];
  const currentStep = currentSteps[step];
  const isLast = step === currentSteps.length - 1;
  const isFirst = step === 0;

  // Reset step when changing mode
  const handleModeChange = (mode: GameMode) => {
    setActiveMode(mode);
    setStep(0);
  };

  const handleClose = () => {
    setStep(0);
    setActiveMode('DOLRYEO_DAEGI');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="게임 가이드">
      {/* ── Mode Selection Tabs ── */}
      <div className="flex justify-between border-b border-white/10 mb-6 pb-2 px-1">
        {(Object.entries(GAME_MODE_INFO) as [GameMode, typeof GAME_MODE_INFO[GameMode]][]).map(([mode, info]) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`text-sm pb-2 font-bold px-2 relative transition-colors ${
              activeMode === mode ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {info.label}
            {activeMode === mode && (
              <div 
                className="absolute bottom-0 left-0 w-full h-[2px] rounded-t-full" 
                style={{ background: 'var(--tujeon-gold)' }} 
              />
            )}
          </button>
        ))}
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {currentSteps.map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-all"
            style={{
              background: i === step ? 'var(--tujeon-gold)' : 'rgba(200,169,110,0.2)',
              transform: i === step ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="anim-fade-up min-h-[200px]" key={activeMode + step}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{currentStep.icon}</span>
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
          >
            {currentStep.title}
          </h3>
        </div>
        <div style={{ color: 'var(--tujeon-cream)' }}>
          {currentStep.content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setStep((s) => s - 1)}
          disabled={isFirst}
        >
          ← 이전
        </Button>
        {isLast ? (
          <Button size="sm" onClick={handleClose}>
            닫기
          </Button>
        ) : (
          <Button size="sm" onClick={() => setStep((s) => s + 1)}>
            다음 →
          </Button>
        )}
      </div>
    </Modal>
  );
}
