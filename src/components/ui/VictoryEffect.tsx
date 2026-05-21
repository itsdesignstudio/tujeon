'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import { gameAudio } from '@/lib/audio';

interface VictoryEffectProps {
  type: 'VICTORY' | 'DEFEAT' | 'DRAW' | null;
}

export default function VictoryEffect({ type }: VictoryEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const particles = useMemo(() => {
    if (type !== 'VICTORY') return [];
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      shape: i % 3 === 0 ? '◆' : i % 3 === 1 ? '★' : '●',
    }));
  }, [type]);

  useEffect(() => {
    if (!type || !containerRef.current || !textRef.current) return;

    // Trigger synthesized procedural SFX matching the visual outcome
    if (type === 'VICTORY') {
      gameAudio.playVictory();
    } else if (type === 'DEFEAT') {
      gameAudio.playDefeat();
    } else if (type === 'DRAW') {
      gameAudio.playDraw();
    }

    const ctx = gsap.context(() => {
      // Text animation
      if (type === 'VICTORY') {
        gsap.fromTo(
          textRef.current,
          { scale: 0, opacity: 0, rotateZ: -5 },
          { scale: 1, opacity: 1, rotateZ: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
        );
      } else if (type === 'DEFEAT') {
        gsap.fromTo(
          textRef.current,
          { y: -60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'bounce.out' }
        );
      } else {
        gsap.fromTo(
          textRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
        );
      }

      // Victory particles
      if (type === 'VICTORY') {
        const particleEls = containerRef.current?.querySelectorAll('.victory-particle');
        particleEls?.forEach((el) => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 80 + Math.random() * 160;
          gsap.fromTo(
            el,
            { x: 0, y: 0, scale: 0, opacity: 1 },
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: gsap.utils.random(0.5, 1.2),
              opacity: 0,
              rotation: gsap.utils.random(-180, 180),
              duration: 1.2,
              ease: 'power3.out',
              delay: Math.random() * 0.2,
            }
          );
        });
      }

      // Auto fade out
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.5,
        delay: type === 'VICTORY' ? 2.5 : 2,
        ease: 'power2.in',
      });
    }, containerRef);

    return () => ctx.revert();
  }, [type]);

  if (!type) return null;

  const config = {
    VICTORY: {
      label: '승리',
      gradient: 'linear-gradient(135deg, #ffd700, #ff8c00)',
      color: '#ffd700',
      glow: 'rgba(255, 215, 0, 0.4)',
    },
    DEFEAT: {
      label: '패배',
      gradient: 'linear-gradient(135deg, #b33a3a, #8b0000)',
      color: '#b33a3a',
      glow: 'rgba(179, 58, 58, 0.3)',
    },
    DRAW: {
      label: '무승부',
      gradient: 'linear-gradient(135deg, #888, #555)',
      color: '#888',
      glow: 'rgba(136, 136, 136, 0.3)',
    },
  };

  const c = config[type];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
    >
      {/* Background dim */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, rgba(0,0,0,0.4) 100%)` }}
      />

      {/* Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="victory-particle absolute text-xl"
          style={{
            color: '#ffd700',
            textShadow: '0 0 8px rgba(255,215,0,0.5)',
          }}
        >
          {p.shape}
        </span>
      ))}

      {/* Main text */}
      <div ref={textRef} className="flex flex-col items-center justify-center relative z-10">
        <span
          className="text-5xl sm:text-6xl font-black tracking-wider py-2 px-4"
          style={{
            fontFamily: 'var(--font-serif)',
            background: c.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 4px 20px ${c.glow})`,
            display: 'inline-block',
          }}
        >
          {c.label}
        </span>
      </div>
    </div>
  );
}
