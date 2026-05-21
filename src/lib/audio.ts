'use client';

class GameAudio {
  private ctx: AudioContext | null = null;
  private volume: number = 0.55;
  private isMuted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tujeon_muted');
        this.isMuted = saved === 'true';
      } catch (e) {
        console.error('Failed to access localStorage:', e);
      }
    }
  }

  getContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('AudioContext is not supported in this browser.');
        return;
      }
      this.ctx = new AudioCtx();
      this.generateNoiseBuffer();
    } catch (e) {
      console.warn('Failed to initialize AudioContext:', e);
    }
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    try {
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 1.5; // 1.5 seconds of noise is plenty
      const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate a smooth, slightly low-pass filtered noise (pink-ish)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Simple first-order lowpass filter for smoother, less harsh paper rustle noise
        data[i] = 0.75 * lastOut + 0.25 * white;
        lastOut = data[i];
      }
      this.noiseBuffer = buffer;
    } catch (e) {
      console.error('Failed to generate noise buffer:', e);
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tujeon_muted', String(this.isMuted));
      } catch (e) {
        console.error('Failed to save mute preference:', e);
      }
    }
    return this.isMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Card slide/draw sound: "샥-"
   */
  playCardDraw(delayMs: number = 0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const time = this.ctx.currentTime + delayMs / 1000;

      // Noise sweep for card brush sliding
      if (this.noiseBuffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        // Sweep frequency downwards to mimic sliding speed slowing down slightly
        filter.frequency.setValueAtTime(1500, time);
        filter.frequency.exponentialRampToValueAtTime(1900, time + 0.06);
        filter.frequency.exponentialRampToValueAtTime(800, time + 0.22);
        
        filter.Q.setValueAtTime(2.0, time);
        filter.Q.exponentialRampToValueAtTime(4.5, time + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.24 * this.volume, time + 0.04); // quick attack
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24); // smooth decay

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start(time);
        source.stop(time + 0.26);
      }
    } catch (e) {
      console.warn('Error playing CardDraw SFX:', e);
    }
  }

  /**
   * Card play sound: "샥-" sliding with a subtle felt table tap landing
   */
  playCardPlay() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const time = this.ctx.currentTime;

      // 1. Fast Noise sweep brush
      if (this.noiseBuffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1700, time);
        filter.frequency.exponentialRampToValueAtTime(900, time + 0.08);
        filter.Q.setValueAtTime(3.0, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.22 * this.volume, time + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start(time);
        source.stop(time + 0.14);
      }

      // 2. Tactile thud: Low frequency pitch slide
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(60, time + 0.05);

      oscGain.gain.setValueAtTime(0, time);
      oscGain.gain.linearRampToValueAtTime(0.09 * this.volume, time + 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.07);
    } catch (e) {
      console.warn('Error playing CardPlay SFX:', e);
    }
  }

  /**
   * Card select/toggle sound: tiny crisp card click
   */
  playCardSelect() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const time = this.ctx.currentTime;

      // Super short highpass filter noise tick
      if (this.noiseBuffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2800, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08 * this.volume, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start(time);
        source.stop(time + 0.045);
      }
    } catch (e) {
      console.warn('Error playing CardSelect SFX:', e);
    }
  }

  /**
   * Victory Sound: Pentatonic chime progression (C4, D4, G4, C5) + High bells
   */
  playVictory() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const time = this.ctx.currentTime;
      const notes = [261.63, 293.66, 392.00, 523.25]; // Pentatonic arpeggio
      const delays = [0, 0.07, 0.14, 0.21];

      notes.forEach((freq, idx) => {
        const t = time + delays[idx];
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();

        osc.type = 'triangle'; // Softer, warmer chime
        osc.frequency.setValueAtTime(freq, t);

        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.1 * this.volume, t + 0.12);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

        osc.connect(oscGain);
        oscGain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + 1.2);
      });

      // Warm high bell chimes
      const bells = [783.99, 1046.50]; // G5, C6
      bells.forEach((freq, idx) => {
        const t = time + 0.32 + idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.035 * this.volume, t + 0.04);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc.connect(oscGain);
        oscGain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + 0.8);
      });
    } catch (e) {
      console.warn('Error playing Victory SFX:', e);
    }
  }

  /**
   * Defeat Sound: Descending minor dissonance chime
   */
  playDefeat() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const time = this.ctx.currentTime;

      // Base low rumbling wave
      const osc1 = this.ctx.createOscillator();
      const osc1Gain = this.ctx.createGain();
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(110.00, time); // A2
      osc1.frequency.linearRampToValueAtTime(55.00, time + 0.95); // Descend to A1

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, time);

      osc1Gain.gain.setValueAtTime(0, time);
      osc1Gain.gain.linearRampToValueAtTime(0.12 * this.volume, time + 0.12);
      osc1Gain.gain.exponentialRampToValueAtTime(0.001, time + 1.25);

      osc1.connect(filter);
      filter.connect(osc1Gain);
      osc1Gain.connect(this.ctx.destination);

      osc1.start(time);
      osc1.stop(time + 1.3);

      // Descending minor chord note
      const osc2 = this.ctx.createOscillator();
      const osc2Gain = this.ctx.createGain();
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(130.81, time + 0.1); // C3 (Forms Minor 3rd with A2)
      osc2.frequency.linearRampToValueAtTime(65.41, time + 0.85);

      osc2Gain.gain.setValueAtTime(0, time + 0.1);
      osc2Gain.gain.linearRampToValueAtTime(0.08 * this.volume, time + 0.22);
      osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + 1.0);

      osc2.connect(osc2Gain);
      osc2Gain.connect(this.ctx.destination);

      osc2.start(time + 0.1);
      osc2.stop(time + 1.05);
    } catch (e) {
      console.warn('Error playing Defeat SFX:', e);
    }
  }

  /**
   * Draw Sound: Warm neutral fifth interval chord
   */
  playDraw() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const time = this.ctx.currentTime;
      const notes = [261.63, 392.00]; // C4 and G4

      notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        oscGain.gain.setValueAtTime(0, time);
        oscGain.gain.linearRampToValueAtTime(0.075 * this.volume, time + 0.12);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.85);

        osc.connect(oscGain);
        oscGain.connect(this.ctx!.destination);

        osc.start(time);
        osc.stop(time + 0.95);
      });
    } catch (e) {
      console.warn('Error playing Draw SFX:', e);
    }
  }
}

export const gameAudio = new GameAudio();

// Bind global unlock listeners on client side to prime the AudioContext
if (typeof window !== 'undefined') {
  const unlock = () => {
    gameAudio.init();
    const ctx = gameAudio.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch((err) => console.warn('Failed to resume AudioContext:', err));
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}
