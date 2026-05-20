'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';

interface GaguRuleHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GaguRuleHelper({ isOpen, onClose }: GaguRuleHelperProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="가구 규칙" bottomSheet>
      <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
        <div>
          <h4 className="font-bold mb-1.5" style={{ color: 'var(--tujeon-gold-light)' }}>
            🎲 가구 — 끗수 대결
          </h4>
          <p className="opacity-90 leading-relaxed">
            카드 숫자의 <strong>합의 끝자리(끗수)</strong>가 점수입니다. 9점이 최강이고, 0점(망)이 최약입니다.
          </p>
        </div>
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="text-xs mb-1.5 opacity-80">예시:</p>
          <p>8 + 7 = 15 → <strong>5점(5끗)</strong></p>
          <p>장(10) + 9 = 19 → <strong>9점(갑오/최강)</strong></p>
        </div>
        <div className="space-y-2">
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(127,176,105,0.1)' }}>
            <span className="font-bold text-green-400">한 장 더 받기 (Hit)</span>
            <p className="text-xs opacity-80 mt-0.5">점수가 낮다면 최대 3장까지 카드를 받습니다.</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(200,169,110,0.1)' }}>
            <span className="font-bold text-yellow-400">여기서 멈춤 (Stand)</span>
            <p className="text-xs opacity-80 mt-0.5">현재 점수에 만족한다면 멈춥니다.</p>
          </div>
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(179,58,58,0.08)' }}>
            <span className="font-bold text-red-400">딜러 규칙</span>
            <p className="text-xs opacity-80 mt-0.5">5점 이하 → Hit / 6점 이상 → Stand</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
