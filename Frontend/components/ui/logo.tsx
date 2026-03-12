'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function ManifoldLogo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      {/* Outer eye shape */}
      <path
        d="M32 12C18 12 6 32 6 32C6 32 18 52 32 52C46 52 58 32 58 32C58 32 46 12 32 12Z"
        stroke="url(#eyeGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Hexagonal iris (blockchain nod) */}
      <path
        d="M32 22L40.5 27V37L32 42L23.5 37V27L32 22Z"
        fill="url(#irisGradient)"
        opacity="0.15"
      />
      <path
        d="M32 22L40.5 27V37L32 42L23.5 37V27L32 22Z"
        stroke="url(#irisGradient)"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Inner pupil - diamond */}
      <rect
        x="28"
        y="28"
        width="8"
        height="8"
        rx="1"
        transform="rotate(45 32 32)"
        fill="url(#pupilGradient)"
      />

      {/* Glint */}
      <circle cx="29" cy="29" r="1.5" fill="white" opacity="0.8" />

      <defs>
        <linearGradient id="eyeGradient" x1="6" y1="32" x2="58" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="irisGradient" x1="23.5" y1="22" x2="40.5" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="pupilGradient" x1="28" y1="28" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ManifoldLogoFull({ className, size = 32 }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <ManifoldLogo size={size} />
      <span className="text-lg font-bold tracking-tight text-white">
        Manifold
      </span>
    </div>
  );
}
