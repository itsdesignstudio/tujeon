'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';

interface GagupanRuleHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GagupanRuleHelper({ isOpen, onClose }: GagupanRuleHelperProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="가구판 규칙" bottomSheet>
      <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
        <div>
          <h4 className="font-bold mb-1.5" style={{ color: 'var(--tujeon-gold-light)' }}>
            🎲 가구판 (Gagupan) — 테이블 베팅
          </h4>
          <p className="opacity-90 leading-relaxed text-xs">
            가구판은 <strong>물주(북-Banker)</strong>와 세 개의 베팅 구역 <strong>'동(東)', '서(西)', '남(南)'</strong> 간의 1:1 점수 대결입니다.
          </p>
        </div>

        <div className="space-y-2">
          <div className="p-2.5 rounded-lg text-xs" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <span className="font-bold" style={{ color: 'var(--tujeon-gold)' }}>1. 베팅 페이즈</span>
            <p className="opacity-80 mt-0.5">유저는 '동, 서, 남' 구역 중 원하는 곳에 원하는 만큼 엽전/칩을 베팅합니다. (여러 곳 동시 베팅 가능)</p>
          </div>
          <div className="p-2.5 rounded-lg text-xs" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <span className="font-bold" style={{ color: 'var(--tujeon-gold)' }}>2. 점수 및 드로우 룰</span>
            <p className="opacity-80 mt-0.5">기본 2장의 카드가 분배됩니다. 각 구역의 점수가 <strong>5점 이하</strong>이면 자동으로 3번째 카드를 추가로 징구합니다. 6점 이상은 스탠드(Stand)합니다.</p>
          </div>
          <div className="p-2.5 rounded-lg text-xs" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <span className="font-bold" style={{ color: 'var(--tujeon-gold)' }}>3. 물주 대결 및 정산</span>
            <p className="opacity-80 mt-0.5">물주(북)의 최종 점수와 각 구역의 점수를 1:1로 개별 비교합니다.</p>
            <ul className="list-disc pl-4 mt-1 opacity-80 space-y-0.5">
              <li>구역 점수 &gt; 물주 점수: <strong className="text-green-400">WIN</strong> (베팅금의 1:1 배당 획득)</li>
              <li>구역 점수 &lt; 물주 점수: <strong className="text-red-400">LOSE</strong> (베팅금 상실)</li>
              <li>구역 점수 == 물주 점수: <strong>DRAW</strong> (베팅금 무승부 반환)</li>
            </ul>
          </div>
        </div>

        <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(127,176,105,0.1)' }}>
          <p className="font-bold mb-1" style={{ color: 'var(--tujeon-gold-light)' }}>💡 끗수 계산:</p>
          <p>숫자의 일의 자리 합 (예: 7 + 8 = 15 → 5끗 / 10 + 9 = 19 → 갑오(9끗))</p>
        </div>
      </div>
    </Modal>
  );
}
