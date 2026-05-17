'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
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
  const sizeClasses = {
    sm: 'text-sm py-2 px-4',
    md: 'text-base py-3 px-8',
    lg: 'text-lg py-4 px-10',
  };

  return (
    <button
      className={`${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
