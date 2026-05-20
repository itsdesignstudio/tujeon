'use client';

import React from 'react';
import { useGameStore } from '@/logic/useGameStore';
import Modal from '@/components/ui/Modal';

interface RuleHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RuleHelper({ isOpen, onClose }: RuleHelperProps) {
  const { gamePhase } = useGameStore();

  const getContent = () => {
    switch (gamePhase) {
      case 'MAKE_COMBINATION':
        return (
          <div className="space-y-4 text-sm" style={{ color: 'var(--tujeon-cream)' }}>
            <div>
              <h4 className="font-bold mb-1.5" style={{ color: 'var(--tujeon-gold-light)' }}>
                💡 미션: 10의 배수 만들기
              </h4>
              <p className="opacity-90 leading-relaxed">
                5장의 패 중 <strong>3장</strong>을 선택해 숫자의 합을 <strong>10, 20, 30</strong>으로 맞추세요. (※ 장은 10으로 계산합니다.)
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <p className="mb-1 text-xs opacity-80">어떤 조합으로도 10의 배수가 안 나온다면?</p>
              <p className="font-bold" style={{ color: 'var(--tujeon-red-light)' }}>
                패가 망가진 <strong>&apos;황&apos;</strong> 상태입니다!
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
                📜 족보 계급도
                <span className="text-xs font-normal opacity-70">(강한 순서)</span>
              </h4>
              <ul className="space-y-2">
                {([
                  { cls: 'jang-ttaeng', label: '장땡', desc: '장(10) 두 장' },
                  { cls: 'ttaeng', label: '땡', desc: '같은 숫자 두 장 (9땡~1땡)' },
                  { cls: 'gabo', label: '가보', desc: '합의 끝자리가 9' },
                  { cls: 'kkut', label: '끗', desc: '합의 끝자리 1~8 (8끗~1끗)' },
                  { cls: 'mang', label: '망', desc: '합의 끝자리가 0' },
                ] as const).map((j) => (
                  <li key={j.cls} className="flex items-center gap-2">
                    <span className={`jokbo-badge-sm ${j.cls}`} style={{ minWidth: 48 }}>{j.label}</span>
                    <span className="opacity-80">{j.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs pt-2 border-t opacity-60" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              * 동일한 족보일 경우 숫자가 높은 패가 승리합니다.<br />
              * &apos;황&apos;은 모든 족보에게 패배합니다.
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="진행 가이드" bottomSheet>
      {getContent()}
    </Modal>
  );
}
