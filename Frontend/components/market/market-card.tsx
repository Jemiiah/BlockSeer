'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Market } from '@/types';
import { cn } from '@/lib/utils';

interface MarketCardProps {
  market: Market;
  index?: number;
}

export function MarketCard({ market, index = 0 }: MarketCardProps) {
  const isPositive = market.change >= 0;
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [displayVolume, setDisplayVolume] = useState('0');

  // Entrance trigger (immediate if no index stagger needed)
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), index * 120 + 50);
    return () => clearTimeout(timer);
  }, [index]);

  // Volume count-up animation
  useEffect(() => {
    if (!hasEntered) return;
    const target = market.volume;
    const numericValue = parseFloat(target.replace(/[^0-9.]/g, ''));
    const suffix = target.replace(/[0-9.,]/g, '');
    if (isNaN(numericValue)) {
      setDisplayVolume(target);
      return;
    }
    const duration = 1200;
    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericValue * eased;
      if (current >= 1000) {
        setDisplayVolume(
          current.toFixed(current >= 10000 ? 0 : 1).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix
        );
      } else {
        setDisplayVolume(current.toFixed(current < 10 ? 2 : 1) + suffix);
      }
      if (step >= steps) {
        clearInterval(interval);
        setDisplayVolume(target);
      }
    }, stepTime);
    return () => clearInterval(interval);
  }, [hasEntered, market.volume]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMousePos({ x: 0.5, y: 0.5 });
  }, []);

  // 3D tilt calculations
  const tiltX = isHovered ? (mousePos.y - 0.5) * -20 : 0;
  const tiltY = isHovered ? (mousePos.x - 0.5) * 20 : 0;

  // Holographic gradient angle based on mouse position
  const holoAngle = Math.atan2(mousePos.y - 0.5, mousePos.x - 0.5) * (180 / Math.PI) + 180;

  // Magnetic pull offset
  const magnetX = isHovered ? (mousePos.x - 0.5) * 6 : 0;
  const magnetY = isHovered ? (mousePos.y - 0.5) * 6 : 0;

  const isLive = market.status === 'live';
  const isTrending = isPositive && market.change > 5;

  return (
    <Link
      ref={cardRef}
      href={`/market/${market.id}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group relative w-full h-full min-h-[272px] cursor-pointer flex flex-col',
        'transition-[opacity,transform] duration-700',
        hasEntered
          ? 'opacity-100 translate-y-0 rotate-0 scale-100'
          : 'opacity-0 translate-y-8 rotate-3 scale-90'
      )}
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Outer holographic border glow */}
      <div
        className="absolute -inset-[2px] rounded-[26px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `conic-gradient(from ${holoAngle}deg at ${mousePos.x * 100}% ${mousePos.y * 100}%, #06b6d4, #8b5cf6, #ec4899, #f59e0b, #10b981, #06b6d4)`,
          filter: 'blur(3px)',
        }}
      />

      {/* Main card body */}
      <div
        className={cn(
          'relative flex flex-col flex-1 rounded-[24px] pt-6 px-6 pb-6 overflow-hidden',
          'bg-[hsl(230,15%,8%)]/95 backdrop-blur-xl',
          'border border-white/[0.06]',
          'transition-all duration-300 ease-out'
        )}
        style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateX(${magnetX}px) translateY(${magnetY}px) translateZ(${isHovered ? 20 : 0}px)`,
          transformStyle: 'preserve-3d',
          boxShadow: isHovered
            ? '0 0 40px -5px hsla(190, 95%, 60%, 0.2), 0 0 80px -10px hsla(300, 80%, 60%, 0.12), 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255,255,255,0.06)'
            : '0 4px 20px -4px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255,255,255,0.03)',
        }}
      >
        {/* Animated mesh gradient background */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at ${mousePos.x * 100}% ${mousePos.y * 100}%, hsla(217, 91%, 60%, ${isHovered ? 0.15 : 0.05}) 0%, transparent 60%), radial-gradient(ellipse at ${100 - mousePos.x * 100}% ${100 - mousePos.y * 100}%, hsla(263, 70%, 60%, ${isHovered ? 0.1 : 0.03}) 0%, transparent 50%)`,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Shimmer sweep for trending markets */}
        {isTrending && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 55%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'mc-shimmer-sweep 3s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Holographic gradient accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300"
          style={{
            background: `linear-gradient(${holoAngle}deg, #06b6d4, #8b5cf6, #ec4899, #10b981)`,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Header */}
        <div
          className="flex items-start justify-between mb-4"
          style={{ transform: 'translateZ(10px)' }}
        >
          {/* Holographic category badge */}
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              borderColor: 'rgba(139, 92, 246, 0.3)',
              background: isHovered
                ? `linear-gradient(${holoAngle}deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15), rgba(236,72,153,0.15))`
                : 'rgba(255,255,255,0.06)',
              color: isHovered ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.4s ease',
              animation: isHovered ? 'mc-badge-hue-rotate 4s linear infinite' : 'none',
            }}
          >
            {market.category}
          </span>

          {/* Live status indicator with pulse rings */}
          {isLive && (
            <span className="relative flex items-center gap-1.5 text-[10px] font-medium">
              <span className="relative">
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: '#34d399',
                    boxShadow: '0 0 8px 2px rgba(52, 211, 153, 0.4)',
                    animation: 'mc-pulse-glow 2s ease-in-out infinite',
                  }}
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    animation: 'mc-expand-ring 2s ease-out infinite',
                  }}
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    animation: 'mc-expand-ring 2s ease-out infinite 0.6s',
                  }}
                />
                <span className="block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              </span>
              <span
                style={{
                  color: '#34d399',
                  textShadow: '0 0 8px rgba(52, 211, 153, 0.5)',
                }}
              >
                Live
              </span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-white font-semibold text-base mb-1 transition-all duration-300"
          style={{
            transform: 'translateZ(15px)',
            color: isHovered ? '#60a5fa' : '#ffffff',
            textShadow: isHovered ? '0 0 20px rgba(96, 165, 250, 0.3)' : 'none',
          }}
        >
          {market.title}
        </h3>
        <p
          className="text-[hsl(230,10%,45%)] text-sm mb-5"
          style={{ transform: 'translateZ(8px)' }}
        >
          {market.subtitle}
        </p>

        {/* Volume with glowing metric */}
        <div
          className="flex items-center justify-between mb-5"
          style={{ transform: 'translateZ(12px)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-300"
              style={{
                backgroundColor: isHovered
                  ? 'rgba(6, 182, 212, 0.08)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isHovered ? 'rgba(6, 182, 212, 0.2)' : 'transparent'}`,
                boxShadow: isHovered
                  ? '0 0 12px -2px rgba(6, 182, 212, 0.15)'
                  : 'none',
              }}
            >
              <DollarSign
                className="w-3.5 h-3.5 transition-colors duration-300"
                style={{ color: isHovered ? '#22d3ee' : 'hsl(230, 10%, 45%)' }}
              />
              <span
                className="text-sm font-semibold transition-all duration-300"
                style={{
                  color: isHovered ? '#e0f2fe' : '#ffffff',
                  textShadow: isHovered
                    ? '0 0 10px rgba(6, 182, 212, 0.4)'
                    : 'none',
                }}
              >
                {displayVolume}
              </span>
              <span className="text-xs text-[hsl(230,10%,45%)]">Vol</span>
            </div>
          </div>
          <span
            className={cn(
              'text-xs font-medium flex items-center gap-0.5 transition-all duration-300',
              isPositive ? 'text-emerald-400' : 'text-red-400'
            )}
            style={{
              textShadow: isHovered
                ? isPositive
                  ? '0 0 10px rgba(52, 211, 153, 0.4)'
                  : '0 0 10px rgba(248, 113, 113, 0.4)'
                : 'none',
            }}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {isPositive ? '+' : ''}
            {market.change}%
          </span>
        </div>

        {/* Outcome Buttons with liquid-fill + haptic bounce */}
        <div
          className="grid grid-cols-2 gap-3 mb-4"
          style={{ transform: 'translateZ(20px)' }}
        >
          <LiquidButton label="Yes" price={market.yesPrice} variant="yes" />
          <LiquidButton label="No" price={market.noPrice} variant="no" />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between text-xs text-[hsl(230,10%,40%)] pt-3 border-t border-white/[0.06]"
          style={{ transform: 'translateZ(5px)' }}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {market.endDate}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ---------------------------------- */
/* Liquid-fill button sub-component   */
/* ---------------------------------- */

interface LiquidButtonProps {
  label: string;
  price: number;
  variant: 'yes' | 'no';
}

function LiquidButton({ label, price, variant }: LiquidButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [fillLevel, setFillLevel] = useState(0);

  // Animate fill on hover
  useEffect(() => {
    if (btnHovered) {
      const interval = setInterval(() => {
        setFillLevel((prev) => Math.min(prev + 4, 100));
      }, 16);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setFillLevel((prev) => Math.max(prev - 6, 0));
      }, 16);
      return () => clearInterval(interval);
    }
  }, [btnHovered]);

  const isYes = variant === 'yes';
  const baseColor = isYes ? '59, 130, 246' : '148, 163, 184';
  const glowColor = isYes
    ? 'rgba(59, 130, 246, 0.3)'
    : 'rgba(148, 163, 184, 0.15)';
  const accentColor = isYes ? '#3b82f6' : '#94a3b8';

  return (
    <button
      className="relative rounded-full py-2 px-3 overflow-hidden"
      style={{
        border: `1px solid rgba(${baseColor}, ${btnHovered ? 0.5 : 0.3})`,
        backgroundColor: `rgba(${baseColor}, ${btnHovered ? 0.12 : 0.08})`,
        transform: isPressed
          ? 'scale(0.95)'
          : btnHovered
            ? 'scale(1.03)'
            : 'scale(1)',
        boxShadow: btnHovered
          ? `0 0 20px -4px ${glowColor}, inset 0 0 15px -5px ${glowColor}`
          : 'none',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onMouseEnter={() => setBtnHovered(true)}
      onMouseLeave={() => {
        setBtnHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={(e) => e.preventDefault()}
    >
      {/* Liquid fill animation */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: `${fillLevel}%`,
          background: `linear-gradient(180deg, rgba(${baseColor}, 0.15) 0%, rgba(${baseColor}, 0.25) 100%)`,
          borderTop:
            fillLevel > 0 ? `1px solid rgba(${baseColor}, 0.2)` : 'none',
          transition: 'none',
        }}
      >
        {fillLevel > 0 && fillLevel < 100 && (
          <div
            className="absolute top-0 left-0 right-0 h-[6px] -translate-y-1/2"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, rgba(${baseColor}, 0.3) 0%, transparent 70%)`,
              animation: 'mc-liquid-wave 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Morphing border glow */}
      {btnHovered && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `1px solid ${accentColor}`,
            opacity: 0.4,
            animation: 'mc-morph-border 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        <div
          className="text-[10px] mb-0.5 transition-colors duration-200"
          style={{
            color: isYes
              ? `rgba(96, 165, 250, ${btnHovered ? 0.9 : 0.7})`
              : `rgba(255, 255, 255, ${btnHovered ? 0.6 : 0.4})`,
          }}
        >
          {label}
        </div>
        <div
          className="text-sm font-bold transition-all duration-200"
          style={{
            color: isYes
              ? btnHovered
                ? '#93bbfd'
                : '#60a5fa'
              : btnHovered
                ? '#cbd5e1'
                : 'rgba(255,255,255,0.7)',
            textShadow: btnHovered ? `0 0 8px ${glowColor}` : 'none',
          }}
        >
          {price}¢
        </div>
      </div>
    </button>
  );
}
