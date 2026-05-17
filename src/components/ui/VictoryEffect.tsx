'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export type ResultType = 'VICTORY' | 'DEFEAT' | 'DRAW' | null;

interface ResultEffectProps {
  type: ResultType;
}

export default function ResultEffect({ type }: ResultEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!type || !containerRef.current || !textRef.current || !particlesRef.current) return;

    if (type === 'VICTORY') {
      // 1. Text Animation: Scale up with elastic bounce and glow
      gsap.fromTo(
        textRef.current,
        { scale: 0, opacity: 0, rotation: -10 },
        {
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 1.2,
          ease: 'elastic.out(1, 0.5)',
        }
      );

      // 2. Continuous Glow Pulse on Text
      gsap.to(textRef.current, {
        textShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(200, 169, 110, 0.6)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5,
      });

      // 3. Particles Burst
      const particles = Array.from(particlesRef.current.children);
      particles.forEach((particle) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 200;
        
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        gsap.fromTo(
          particle,
          { x: 0, y: 0, scale: 0, opacity: 1, rotation: 0 },
          {
            x,
            y,
            scale: Math.random() * 0.8 + 0.4,
            opacity: 0,
            rotation: Math.random() * 360 - 180,
            duration: 1 + Math.random() * 1.5,
            ease: 'power3.out',
            delay: Math.random() * 0.1,
          }
        );
      });
    } else if (type === 'DEFEAT') {
      // Heavy drop effect for defeat
      gsap.fromTo(
        textRef.current,
        { scale: 3, opacity: 0, y: -50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }
      );
    } else if (type === 'DRAW') {
      // Smooth fade in for draw
      gsap.fromTo(
        textRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out' }
      );
    }
  }, { dependencies: [type] });

  if (!type) return null;

  let message = '';
  let textStyle: React.CSSProperties = {
    fontFamily: 'var(--font-serif)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  if (type === 'VICTORY') {
    message = '승리!';
    textStyle = {
      ...textStyle,
      color: 'var(--tujeon-gold-light)',
      backgroundImage: 'linear-gradient(to bottom, #FFFDE4, var(--tujeon-gold))',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: '0 0 20px rgba(200, 169, 110, 0.4)',
    };
  } else if (type === 'DEFEAT') {
    message = '패배';
    textStyle = {
      ...textStyle,
      color: '#ff6b6b',
      backgroundImage: 'linear-gradient(to bottom, #ff9999, #cc0000)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
    };
  } else if (type === 'DRAW') {
    message = '무승부';
    textStyle = {
      ...textStyle,
      color: '#aaaaaa',
      backgroundImage: 'linear-gradient(to bottom, #ffffff, #888888)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: '0 2px 5px rgba(0, 0, 0, 0.5)',
    };
  }

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden"
    >
      {/* Particles Container (only for victory) */}
      <div ref={particlesRef} className="absolute inset-0 flex items-center justify-center">
        {type === 'VICTORY' && Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: Math.random() > 0.5 ? 'var(--tujeon-gold)' : 'var(--tujeon-gold-light)',
              boxShadow: '0 0 10px var(--tujeon-gold-dim)',
              clipPath: Math.random() > 0.5 ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Main Result Text */}
      <h2
        ref={textRef}
        className="text-7xl font-black relative z-10 leading-normal py-4"
        style={textStyle}
      >
        {message}
      </h2>
    </div>
  );
}
