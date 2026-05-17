'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/logic/useGameStore';

export default function RuleHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const { gamePhase } = useGameStore();

  // Return content based on the current game phase
  const getContent = () => {
    switch (gamePhase) {
      case 'MAKE_COMBINATION':
        return (
          <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <div>
              <h4 className="font-bold mb-1" style={{ color: 'var(--tujeon-gold-light)' }}>
                💡 미션: 10의 배수 만들기
              </h4>
              <p className="opacity-90">
                5장의 패 중 <strong>3장</strong>을 선택해 숫자의 합을 <strong>10, 20, 30</strong>으로 맞추세요. (※ 장은 10으로 계산합니다.)
              </p>
            </div>
            
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <p className="mb-1 text-xs opacity-80">어떤 조합으로도 10의 배수가 안 나온다면?</p>
              <p className="font-bold" style={{ color: 'var(--tujeon-red-light)' }}>
                패가 망가진 <strong>'황'</strong> 상태입니다!
              </p>
              <p className="mt-1 opacity-90">
                [황 선언] 버튼을 눌러 이번 라운드를 포기할 수 있습니다.
              </p>
            </div>
          </div>
        );

      case 'SHOWDOWN':
      case 'RESULT':
        return (
          <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--tujeon-gold-light)' }}>
                <span>📜 족보 계급도</span>
                <span className="text-xs font-normal opacity-70">(강한 순서)</span>
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge jang-ttaeng text-xs py-1 px-2 !min-w-[48px]">장땡</span>
                  <span>장(10) 두 장</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge ttaeng text-xs py-1 px-2 !min-w-[48px]">땡</span>
                  <span>같은 숫자 두 장 (9땡~1땡)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge gabo text-xs py-1 px-2 !min-w-[48px]">가보</span>
                  <span>합의 끝자리가 9</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge kkut text-xs py-1 px-2 !min-w-[48px]">끗</span>
                  <span className="opacity-80">합의 끝자리가 1~8 (8끗~1끗)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge mang text-xs py-1 px-2 !min-w-[48px]">망</span>
                  <span className="opacity-60">합의 끝자리가 0</span>
                </li>
              </ul>
            </div>
            
            <p className="text-xs pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--tujeon-cream-dim)' }}>
              * 동일한 족보일 경우 숫자가 높은 패가 승리합니다.<br/>
              * '황'은 모든 족보에게 패배합니다.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <p>게임을 시작하면 상황에 맞는 규칙이 이곳에 표시됩니다.</p>
          </div>
        );
    }
  };

  // Do not render helper in LOBBY phase since there's already a tutorial button
  if (gamePhase === 'LOBBY') return null;

  return (
    <div className="fixed right-6 top-6 z-50 flex flex-col items-end pointer-events-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-panel p-3 rounded-full flex items-center gap-2 justify-center hover:bg-white/10 transition-colors pointer-events-auto border"
        style={{ 
          borderColor: isOpen ? 'var(--tujeon-gold)' : 'rgba(200, 169, 110, 0.3)',
          boxShadow: isOpen ? 'var(--shadow-glow-gold)' : 'none'
        }}
        aria-label="상황별 규칙 도우미"
      >
        <span className="text-xl leading-none">📖</span>
        {!isOpen && (
          <span 
            className="text-sm pr-1 font-bold tracking-wide" 
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
          >
            규칙 도우미
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="glass-panel mt-3 p-5 w-80 anim-fade-up pointer-events-auto"
          style={{ 
            background: 'rgba(26, 21, 18, 0.95)',
            border: '1px solid rgba(200, 169, 110, 0.4)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}
        >
          <div className="flex justify-between items-center mb-4 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <h3 
              className="text-lg font-bold" 
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold)' }}
            >
              진행 가이드
            </h3>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-xs hover:text-white transition-colors"
              style={{ color: 'var(--tujeon-cream-dim)' }}
            >
              닫기 ✕
            </button>
          </div>
          {getContent()}
        </div>
      )}
    </div>
  );
}
