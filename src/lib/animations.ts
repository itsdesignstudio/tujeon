// ============================================================
// Tujeon (투전) — GSAP Animation Utilities
// Central animation system for all card game interactions.
// All durations are tuned for non-disruptive gameplay feel.
// ============================================================

import gsap from 'gsap';

// ── Duration Constants (seconds) ──
export const ANIM = {
  DEAL_CARD: 0.45,
  DEAL_STAGGER: 0.08,
  CARD_SELECT: 0.25,
  CARD_DESELECT: 0.2,
  CARD_PLAY: 0.4,
  CARD_FLIP: 0.5,
  FLIP_STAGGER: 0.15,
  SHUFFLE_HALF: 0.35,
  RESULT_SHEET: 0.5,
  TRICK_COLLECT: 0.5,
  PHASE_TEXT: 0.35,
  BADGE_POP: 0.4,
  CHIP_COUNT: 0.8,
  PARTICLE_BURST: 1.2,
  FADE: 0.3,
} as const;

// ── Deal cards from deck to hand positions ──
export function animateDeal(
  cardEls: HTMLElement[],
  deckRect: { x: number; y: number },
  options?: { onComplete?: () => void }
): gsap.core.Timeline {
  const tl = gsap.timeline({
    onComplete: options?.onComplete,
  });

  cardEls.forEach((el, i) => {
    // Set initial state: at deck position, small and invisible
    gsap.set(el, {
      x: deckRect.x - el.getBoundingClientRect().left,
      y: deckRect.y - el.getBoundingClientRect().top,
      scale: 0.4,
      opacity: 0,
      rotateZ: gsap.utils.random(-15, 15),
    });

    tl.to(
      el,
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        rotateZ: 0,
        duration: ANIM.DEAL_CARD,
        ease: 'back.out(1.4)',
      },
      i * ANIM.DEAL_STAGGER
    );
  });

  return tl;
}

// ── Fan-out cards into arc positions ──
export function animateFanOut(
  cardEls: HTMLElement[],
  fanConfig?: { arcDegrees?: number; lift?: number }
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const count = cardEls.length;
  if (count === 0) return tl;

  const arcDeg = fanConfig?.arcDegrees ?? 30;
  const lift = fanConfig?.lift ?? 5;
  const step = count > 1 ? arcDeg / (count - 1) : 0;
  const startAngle = -arcDeg / 2;

  cardEls.forEach((el, i) => {
    const angle = startAngle + step * i;
    const liftY = -Math.abs(Math.cos((angle * Math.PI) / 180)) * lift;

    tl.to(
      el,
      {
        rotateZ: angle,
        y: liftY,
        duration: ANIM.CARD_SELECT,
        ease: 'power2.out',
      },
      i * 0.03
    );
  });

  return tl;
}

// ── Card selection animation ──
export function animateSelect(el: HTMLElement): gsap.core.Tween {
  return gsap.to(el, {
    y: -20,
    scale: 1.08,
    duration: ANIM.CARD_SELECT,
    ease: 'back.out(2)',
  });
}

export function animateDeselect(el: HTMLElement): gsap.core.Tween {
  return gsap.to(el, {
    y: 0,
    scale: 1,
    duration: ANIM.CARD_DESELECT,
    ease: 'power2.out',
  });
}

// ── Card play: fly from hand to table center ──
export function animateCardPlay(
  cardEl: HTMLElement,
  targetRect: { x: number; y: number },
  options?: { onComplete?: () => void }
): gsap.core.Tween {
  const rect = cardEl.getBoundingClientRect();
  return gsap.to(cardEl, {
    x: targetRect.x - rect.left - rect.width / 2,
    y: targetRect.y - rect.top - rect.height / 2,
    scale: 0.8,
    rotateZ: gsap.utils.random(-5, 5),
    duration: ANIM.CARD_PLAY,
    ease: 'power2.inOut',
    onComplete: options?.onComplete,
  });
}

// ── 3D Card flip ──
export function animateFlip(
  innerEl: HTMLElement,
  toFaceUp: boolean,
  options?: { delay?: number; onComplete?: () => void }
): gsap.core.Tween {
  return gsap.to(innerEl, {
    rotateY: toFaceUp ? 0 : 180,
    duration: ANIM.CARD_FLIP,
    ease: 'power2.inOut',
    delay: options?.delay ?? 0,
    onComplete: options?.onComplete,
  });
}

// ── Staggered reveal of multiple cards ──
export function animateReveal(
  cardInners: HTMLElement[],
  options?: { onComplete?: () => void }
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: options?.onComplete });

  cardInners.forEach((el, i) => {
    tl.to(
      el,
      {
        rotateY: 0,
        duration: ANIM.CARD_FLIP,
        ease: 'power2.inOut',
      },
      i * ANIM.FLIP_STAGGER
    );
  });

  return tl;
}

// ── Jokbo badge pop-in ──
export function animateBadgePop(el: HTMLElement): gsap.core.Tween {
  gsap.set(el, { scale: 0, opacity: 0 });
  return gsap.to(el, {
    scale: 1,
    opacity: 1,
    duration: ANIM.BADGE_POP,
    ease: 'elastic.out(1, 0.5)',
  });
}

// ── Strong jokbo: screen shake + flash ──
export function animateStrongJokbo(containerEl: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Flash overlay
  tl.fromTo(
    containerEl,
    { boxShadow: 'inset 0 0 0 rgba(255,215,0,0)' },
    {
      boxShadow: 'inset 0 0 100px rgba(255,215,0,0.15)',
      duration: 0.15,
      yoyo: true,
      repeat: 1,
    }
  );

  // Micro shake
  tl.to(
    containerEl,
    {
      x: -3,
      duration: 0.05,
      yoyo: true,
      repeat: 5,
      ease: 'none',
    },
    0
  );

  return tl;
}

// ── Trick collect: cards fly to winner's direction ──
export function animateTrickCollect(
  cardEls: HTMLElement[],
  winnerDirection: 'top' | 'bottom' | 'left' | 'right',
  options?: { onComplete?: () => void }
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: options?.onComplete });

  const offsets = {
    top: { x: 0, y: -200 },
    bottom: { x: 0, y: 200 },
    left: { x: -200, y: 0 },
    right: { x: 200, y: 0 },
  };

  const offset = offsets[winnerDirection];

  cardEls.forEach((el, i) => {
    tl.to(
      el,
      {
        x: `+=${offset.x}`,
        y: `+=${offset.y}`,
        opacity: 0,
        scale: 0.5,
        duration: ANIM.TRICK_COLLECT,
        ease: 'power2.in',
      },
      i * 0.05
    );
  });

  return tl;
}

// ── Bottom sheet slide up ──
export function animateSheetUp(
  el: HTMLElement,
  options?: { onComplete?: () => void }
): gsap.core.Tween {
  gsap.set(el, { y: '100%', opacity: 0 });
  return gsap.to(el, {
    y: '0%',
    opacity: 1,
    duration: ANIM.RESULT_SHEET,
    ease: 'power3.out',
    onComplete: options?.onComplete,
  });
}

export function animateSheetDown(
  el: HTMLElement,
  options?: { onComplete?: () => void }
): gsap.core.Tween {
  return gsap.to(el, {
    y: '100%',
    opacity: 0,
    duration: ANIM.FADE,
    ease: 'power2.in',
    onComplete: options?.onComplete,
  });
}

// ── Chip counter animation ──
export function animateChipCount(
  el: HTMLElement,
  from: number,
  to: number,
  options?: { duration?: number }
): gsap.core.Tween {
  const obj = { value: from };
  return gsap.to(obj, {
    value: to,
    duration: options?.duration ?? ANIM.CHIP_COUNT,
    ease: 'power1.out',
    onUpdate: () => {
      el.textContent = Math.round(obj.value).toLocaleString('en-US');
    },
  });
}

// ── Phase text transition ──
export function animatePhaseText(
  outEl: HTMLElement | null,
  inEl: HTMLElement,
  options?: { onComplete?: () => void }
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: options?.onComplete });

  if (outEl) {
    tl.to(outEl, {
      y: -20,
      opacity: 0,
      duration: ANIM.PHASE_TEXT,
      ease: 'power2.in',
    });
  }

  gsap.set(inEl, { y: 20, opacity: 0 });
  tl.to(inEl, {
    y: 0,
    opacity: 1,
    duration: ANIM.PHASE_TEXT,
    ease: 'power2.out',
  });

  return tl;
}

// ── Shuffle deck visual ──
export function animateShuffle(
  deckEl: HTMLElement,
  options?: { onComplete?: () => void }
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: options?.onComplete });

  // Split and merge animation (2 riffles)
  for (let i = 0; i < 2; i++) {
    tl.to(deckEl, {
      rotateZ: -8,
      x: -6,
      duration: ANIM.SHUFFLE_HALF,
      ease: 'power1.inOut',
    })
      .to(deckEl, {
        rotateZ: 8,
        x: 6,
        duration: ANIM.SHUFFLE_HALF,
        ease: 'power1.inOut',
      })
      .to(deckEl, {
        rotateZ: 0,
        x: 0,
        duration: ANIM.SHUFFLE_HALF * 0.7,
        ease: 'power2.out',
      });
  }

  return tl;
}

// ── Particle burst (for victory) ──
export function animateParticleBurst(
  particleEls: HTMLElement[],
  options?: { color?: string }
): gsap.core.Timeline {
  const tl = gsap.timeline();

  particleEls.forEach((el) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 180;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    gsap.set(el, { x: 0, y: 0, scale: 0, opacity: 1 });

    tl.to(
      el,
      {
        x,
        y,
        scale: gsap.utils.random(0.4, 1),
        opacity: 0,
        rotation: gsap.utils.random(-180, 180),
        duration: ANIM.PARTICLE_BURST,
        ease: 'power3.out',
      },
      Math.random() * 0.15
    );
  });

  return tl;
}

// ── Card scatter (defeat) ──
export function animateDefeatScatter(
  cardEls: HTMLElement[]
): gsap.core.Timeline {
  const tl = gsap.timeline();

  cardEls.forEach((el, i) => {
    tl.to(
      el,
      {
        y: gsap.utils.random(50, 150),
        x: gsap.utils.random(-100, 100),
        rotateZ: gsap.utils.random(-45, 45),
        opacity: 0.3,
        duration: 0.6,
        ease: 'power2.in',
      },
      i * 0.05
    );
  });

  return tl;
}

// ── Counter badge popup (+1, -100, etc.) ──
export function animateCounterPop(
  el: HTMLElement,
  options?: { direction?: 'up' | 'down' }
): gsap.core.Timeline {
  const dir = options?.direction ?? 'up';
  const tl = gsap.timeline();

  gsap.set(el, { y: 0, opacity: 0, scale: 0.5 });

  tl.to(el, {
    y: dir === 'up' ? -30 : 30,
    opacity: 1,
    scale: 1,
    duration: 0.3,
    ease: 'back.out(2)',
  }).to(el, {
    y: dir === 'up' ? -50 : 50,
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in',
    delay: 0.5,
  });

  return tl;
}
