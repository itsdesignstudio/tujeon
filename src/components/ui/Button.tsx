'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'danger'
      ? 'btn-danger'
      : 'btn-secondary';

  const sizeClasses = {
    sm: 'text-xs py-2 px-4 min-h-[36px]',
    md: 'text-sm py-2.5 px-6 min-h-[44px]',
    lg: 'text-base py-3 px-8 min-h-[48px]',
  };

  return (
    <button
      className={`${variantClass} ${sizeClasses[size]} active:scale-[0.96] transition-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
