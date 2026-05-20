'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';

interface SutujeonRuleHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SutujeonRuleHelper({ isOpen, onClose }: SutujeonRuleHelperProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="수투전 규칙" bottomSheet>
      <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
        <div>
          <h4 className="font-bold mb-1.5" style={{ color: 'var(--tujeon-gold-light)' }}>
            ⚔️ 수투전 — 수 겨루기
          </h4>
          <p className="opacity-90 leading-relaxed text-xs">
            4인이 20수를 겨루는 전통 수 겨루기 게임. 8가지 문양, 총 80장의 확장 덱을 사용합니다.
          </p>
        </div>
        <div className="space-y-2.5">
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(200,169,110,0.08)' }}>
            <span className="font-bold text-yellow-400 text-xs">1. 한 수</span>
            <p className="text-[11px] opacity-80 mt-0.5">네 사람이 각자 한 장씩 낸 뒤, 가장 강한 패를 낸 사람이 가져가는 4장 묶음입니다.</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(200,169,110,0.08)' }}>
            <span className="font-bold text-yellow-400 text-xs">2. 수를 따다 (승리)</span>
            <p className="text-[11px] opacity-80 mt-0.5">한 수를 이겨 낸 카드를 가져가는 것입니다. 획득 시 <strong>먹은 수</strong>가 1 증가합니다.</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(127,176,105,0.08)' }}>
            <span className="font-bold text-green-400 text-xs">3. 주도 문양 (Led Suit)</span>
            <p className="text-[11px] opacity-80 mt-0.5">선(첫 번째) 플레이어가 낸 카드의 문양이 해당 수의 주도 문양이 됩니다.</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(127,176,105,0.08)' }}>
            <span className="font-bold text-green-400 text-xs">4. 의무 따르기</span>
            <p className="text-[11px] opacity-80 mt-0.5">주도 문양과 같은 카드가 패에 있으면 반드시 그 문양의 카드를 내야 합니다.</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="font-bold text-gray-300 text-xs">5. 버리기</span>
            <p className="text-[11px] opacity-80 mt-0.5">해당 문양이 없으면 아무 카드나 낼(버릴) 수 있지만, 그 수에서는 승리할 수 없습니다.</p>
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="font-bold text-xs mb-1.5" style={{ color: 'var(--tujeon-gold)' }}>문양별 카드 파워:</p>
          <p className="text-xs opacity-80">
            <strong className="text-yellow-400">높을수록 강함</strong> (사람/물고기/새/꿩): 장 &gt; 9 &gt; 8 &gt; ... &gt; 1
          </p>
          <p className="text-xs opacity-80 mt-1">
            <strong className="text-gray-300">낮을수록 강함</strong> (별/말/사슴/토끼): 장 &gt; 1 &gt; 2 &gt; ... &gt; 9
          </p>
        </div>
      </div>
    </Modal>
  );
}
