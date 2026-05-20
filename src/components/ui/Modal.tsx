'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** If true, renders as a bottom sheet instead of centered modal */
  bottomSheet?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  bottomSheet = false,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentTranslateY = useRef(0);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Drag-to-close for bottom sheet
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!bottomSheet) return;
      dragStartY.current = e.touches[0].clientY;
      currentTranslateY.current = 0;
    },
    [bottomSheet]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!bottomSheet || dragStartY.current === null || !contentRef.current)
        return;
      const deltaY = e.touches[0].clientY - dragStartY.current;
      if (deltaY > 0) {
        currentTranslateY.current = deltaY;
        contentRef.current.style.transform = `translateY(${deltaY}px)`;
        contentRef.current.style.transition = 'none';
      }
    },
    [bottomSheet]
  );

  const handleTouchEnd = useCallback(() => {
    if (!bottomSheet || !contentRef.current) return;
    contentRef.current.style.transition = 'transform 0.3s ease-out';
    if (currentTranslateY.current > 100) {
      contentRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 300);
    } else {
      contentRef.current.style.transform = 'translateY(0)';
    }
    dragStartY.current = null;
    currentTranslateY.current = 0;
  }, [bottomSheet, onClose]);

  if (!isOpen) return null;

  if (bottomSheet) {
    return (
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={{ animation: 'fadeSlideUp 0.2s ease-out' }}
        />
        {/* Sheet */}
        <div
          ref={contentRef}
          className="bottom-sheet anim-slide-up-sheet"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="bottom-sheet-handle" />

          {title && (
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-bold"
                style={{
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--tujeon-gold)',
                }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full opacity-50 hover:opacity-100 transition-opacity"
                style={{
                  color: 'var(--tujeon-cream)',
                  background: 'rgba(255,255,255,0.05)',
                }}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  // Standard centered modal
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-xl font-bold"
              style={{
                fontFamily: 'var(--font-serif)',
                color: 'var(--tujeon-gold)',
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full opacity-50 hover:opacity-100 transition-opacity"
              style={{
                color: 'var(--tujeon-cream)',
                background: 'rgba(255,255,255,0.05)',
              }}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
