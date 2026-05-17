'use client';

import React, { useState } from 'react';
import { useSutujeonStore } from '@/logic/useSutujeonStore';

export default function SutujeonRuleHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const { gamePhase } = useSutujeonStore();

  const getContent = () => {
    return (
      <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar" style={{ color: 'var(--tujeon-cream)' }}>
        <div>
          <h4 className="font-bold mb-1" style={{ color: 'var(--tujeon-gold-light)' }}>
            🎯 목표: 트릭(라운드) 많이 따내기
          </h4>
          <p className="opacity-90 text-xs">
            총 20번의 트릭(라운드)이 진행됩니다. 각 라운드마다 가장 강력한 카드를 낸 사람이 4장의 카드를 모두 가져갑니다(1 트릭 승리). 20트릭 종료 후 가장 많은 트릭을 따낸 사람이 최종 승리합니다.
          </p>
        </div>
        
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="font-bold mb-1" style={{ color: 'var(--tujeon-gold)' }}>주도 문양 (Led Suit) 필수 규칙</p>
          <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
            <li>선(처음 카드를 내는 사람)이 낸 카드의 문양이 <strong>주도 문양</strong>이 됩니다.</li>
            <li>다른 사람들은 패에 <strong>주도 문양과 같은 카드</strong>가 있다면 <strong>반드시</strong> 그 문양을 내야 합니다.</li>
            <li>해당 문양이 아예 없다면 아무 카드나 버릴 수 있지만, 승리할 수는 없습니다.</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--tujeon-gold-light)' }}>
            <span>⚔️ 문양별 파워 (계급)</span>
          </h4>
          <p className="opacity-80 text-[10px] mb-2">* 장(10)은 어떤 문양이든 항상 최강입니다.</p>
          <ul className="space-y-3">
            <li>
              <div className="text-xs font-bold mb-1" style={{ color: '#c8a96e' }}>높을수록 강한 문양 (High Wins)</div>
              <div className="flex gap-1 text-[10px] opacity-70 mb-1">
                <span>사람(人)</span> · <span>물고기(魚)</span> · <span>새(鳥)</span> · <span>꿩(雉)</span>
              </div>
              <div className="text-xs flex gap-1 items-center bg-black/20 p-1 rounded">
                <span className="font-bold text-white">장(10)</span> <span className="text-[10px]">&gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3 &gt; 2 &gt; 1</span>
              </div>
            </li>
            <li>
              <div className="text-xs font-bold mb-1" style={{ color: '#ffd700' }}>낮을수록 강한 문양 (Low Wins)</div>
              <div className="flex gap-1 text-[10px] opacity-70 mb-1">
                <span>별(星)</span> · <span>말(馬)</span> · <span>사슴(鹿)</span> · <span>토끼(兔)</span>
              </div>
              <div className="text-xs flex gap-1 items-center bg-black/20 p-1 rounded">
                <span className="font-bold text-white">장(10)</span> <span className="text-[10px]">&gt; 1 &gt; 2 &gt; 3 &gt; 4 &gt; 5 &gt; 6 &gt; 7 &gt; 8 &gt; 9</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    );
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
        aria-label="수투전 진행 가이드"
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
              수투전 룰 가이드
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
