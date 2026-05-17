'use client';

import React, { useState } from 'react';
import { useGaguStore } from '@/logic/useGaguStore';

export default function GaguRuleHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const { gamePhase } = useGaguStore();

  // Return content based on the current game phase
  const getContent = () => {
    switch (gamePhase) {
      case 'PLAYER_ACTION':
        return (
          <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <div>
              <h4 className="font-bold mb-1" style={{ color: 'var(--tujeon-gold-light)' }}>
                💡 미션: 9(갑오)에 가깝게 만들기
              </h4>
              <p className="opacity-90 mb-2">
                받은 카드의 숫자 합 중 <strong>1의 자리(끗수)</strong>가 9에 가까울수록 유리합니다.
                <br />(※ 장은 10으로 계산되어 0점이 됩니다.)
              </p>
            </div>
            
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <p className="font-bold mb-1" style={{ color: 'var(--tujeon-gold)' }}>플레이어의 선택</p>
              <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
                <li><strong>한 장 더 받기 (Hit):</strong> 점수가 낮다고 판단되면 최대 3장까지 카드를 더 받을 수 있습니다.</li>
                <li><strong>여기서 멈춤 (Stand):</strong> 현재 점수에 만족한다면 멈추고 딜러의 턴으로 넘깁니다.</li>
              </ul>
            </div>
          </div>
        );

      case 'DEALER_ACTION':
        return (
          <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <div>
              <h4 className="font-bold mb-1" style={{ color: 'var(--tujeon-gold-light)' }}>
                🤖 딜러의 턴
              </h4>
              <p className="opacity-90">
                딜러는 플레이어처럼 자유롭게 선택하지 않고, 정해진 규칙에 따라 행동합니다.
              </p>
            </div>
            
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
                <li>딜러 점수가 <strong>5 이하</strong>: 무조건 한 장 더 받습니다(Hit).</li>
                <li>딜러 점수가 <strong>6 이상</strong>: 여기서 멈춥니다(Stand).</li>
              </ul>
            </div>
          </div>
        );

      case 'SHOWDOWN':
      case 'RESULT':
        return (
          <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--tujeon-gold-light)' }}>
                <span>📜 가구 점수판</span>
                <span className="text-xs font-normal opacity-70">(강한 순서)</span>
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge gabo text-xs py-1 px-2 !min-w-[48px]">갑오(9)</span>
                  <span>합의 끝자리가 9 (최고 점수)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge kkut text-xs py-1 px-2 !min-w-[48px]">8끗~1끗</span>
                  <span className="opacity-80">합의 끝자리가 8에서 1</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="jokbo-badge mang text-xs py-1 px-2 !min-w-[48px]">망(0)</span>
                  <span className="opacity-60">합의 끝자리가 0 (최하 점수)</span>
                </li>
              </ul>
            </div>
            
            <p className="text-xs pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--tujeon-cream-dim)' }}>
              * 플레이어와 딜러의 끝자리가 높은 쪽이 승리합니다.<br/>
              * 점수가 같을 경우 무승부 처리됩니다.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <p>게임을 시작하면 상황에 맞는 가구가 이곳에 표시됩니다.</p>
          </div>
        );
    }
  };

  if (gamePhase === 'INIT') return null;

  return (
    <div className="fixed right-6 top-6 z-50 flex flex-col items-end pointer-events-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-panel p-3 rounded-full flex items-center gap-2 justify-center hover:bg-white/10 transition-colors pointer-events-auto border"
        style={{ 
          borderColor: isOpen ? 'var(--tujeon-gold)' : 'rgba(200, 169, 110, 0.3)',
          boxShadow: isOpen ? 'var(--shadow-glow-gold)' : 'none'
        }}
        aria-label="가구 진행 가이드"
      >
        <span className="text-xl leading-none">📖</span>
        {!isOpen && (
          <span 
            className="text-sm pr-1 font-bold tracking-wide" 
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--tujeon-gold-light)' }}
          >
            진행 가이드
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
              가구 진행 가이드
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
