'use client';

import { useState, useEffect, useRef } from 'react';
import { Market, OutcomeType } from '@/types';
import { cn, calculateOrderSummary, calculateOdds } from '@/lib/utils';
import { usePrediction } from '@/hooks/use-prediction';
import { useOnChainPool } from '@/hooks/use-on-chain-pool';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

/* ─── Confetti Burst ─── */
function ConfettiBurst({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#00f0ff', '#a855f7', '#f43f5e', '#22c55e', '#facc15', '#3b82f6'];
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      rotation: number;
      rotationSpeed: number;
    }[] = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 4,
        size: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.015;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (alive) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

/* ─── Orbital Spinner ─── */
function OrbitalSpinner({ size = 20 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
        style={{
          borderTopColor: '#00f0ff',
          borderRightColor: '#a855f7',
          animationDuration: '0.8s',
        }}
      />
      <div
        className="absolute rounded-full bg-cyan-400"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 8px #00f0ff, 0 0 16px #00f0ff',
        }}
      />
    </div>
  );
}

/* ─── Liquid Fill Circle ─── */
function LiquidFillCircle({
  percentage,
  size = 48,
  isYes,
}: {
  percentage: number;
  size?: number;
  isYes: boolean;
}) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillLength = (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isYes ? 'url(#gradYes)' : 'url(#gradNo)'}
          strokeWidth={3}
          strokeDasharray={`${fillLength} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 4px ${isYes ? '#3b82f6' : '#a855f7'})`,
          }}
        />
        <defs>
          <linearGradient id="gradYes" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>
          <linearGradient id="gradNo" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'text-[10px] font-bold',
            isYes ? 'text-cyan-400' : 'text-purple-400'
          )}
        >
          {percentage}%
        </span>
      </div>
    </div>
  );
}

/* ─── Shimmer Bar ─── */
function ShimmerBar() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
          animation: 'shimmer-wave 2.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}

/* ─── Mini Sparkline ─── */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 16;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Styles injected via <style> ─── */
const panelStyles = `
@keyframes shimmer-wave {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes shimmer-sweep {
  0% { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(200%) skewX(-15deg); }
}
@keyframes neon-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes glow-ring {
  0%, 100% { box-shadow: 0 0 4px rgba(59,130,246,0.3), 0 0 8px rgba(59,130,246,0.1); }
  50% { box-shadow: 0 0 8px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.2), 0 0 40px rgba(59,130,246,0.1); }
}
@keyframes float-glow {
  0%, 100% { text-shadow: 0 0 4px rgba(0,240,255,0.4); }
  50% { text-shadow: 0 0 12px rgba(0,240,255,0.8), 0 0 24px rgba(0,240,255,0.3); }
}
@keyframes stat-count-up {
  0% { opacity: 0; transform: translateY(8px); }
  60% { opacity: 1; transform: translateY(-2px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes flip-reveal {
  0% { transform: perspective(600px) rotateX(-90deg); opacity: 0; }
  100% { transform: perspective(600px) rotateX(0deg); opacity: 1; }
}
@keyframes success-bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  10%, 50%, 90% { transform: translateX(-4px); }
  30%, 70% { transform: translateX(4px); }
}
@keyframes celebration-glow {
  0% { box-shadow: 0 0 20px rgba(34,197,94,0.2); }
  50% { box-shadow: 0 0 40px rgba(34,197,94,0.4), 0 0 80px rgba(34,197,94,0.1); }
  100% { box-shadow: 0 0 20px rgba(34,197,94,0.2); }
}
@keyframes ripple-click {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes press-3d {
  0% { transform: perspective(600px) translateZ(0px); }
  50% { transform: perspective(600px) translateZ(-6px); }
  100% { transform: perspective(600px) translateZ(0px); }
}
@keyframes grid-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(20px); }
}
@keyframes warning-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@keyframes step-dot-glow {
  0%, 100% { box-shadow: 0 0 4px currentColor; }
  50% { box-shadow: 0 0 12px currentColor, 0 0 24px currentColor; }
}
@keyframes electric-tick {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; text-shadow: 0 0 8px currentColor; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/* ─── Main TradingPanel Component ─── */
interface TradingPanelProps {
  market: Market;
}

export function TradingPanel({ market }: TradingPanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType>('yes');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [ctaRipple, setCtaRipple] = useState<{ x: number; y: number } | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { connected, address, connecting } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { makePrediction, isLoading, error } = usePrediction();
  const { pool: onChainPool, totalPredictions, isLoading: poolLoading } = useOnChainPool(market.id);

  const handleConnectWallet = () => {
    setWalletModalVisible(true);
  };

  // Compute on-chain stakes for odds calculation
  const onChainStakes = onChainPool
    ? { optionAStakes: onChainPool.option_a_stakes, optionBStakes: onChainPool.option_b_stakes }
    : undefined;

  const oddsInfo = onChainStakes
    ? calculateOdds(onChainStakes.optionAStakes, onChainStakes.optionBStakes)
    : null;

  const orderSummary = calculateOrderSummary(amount, selectedOutcome, market, onChainStakes);
  const quickAmounts = [10, 25, 50, 100];

  const yesPrice = oddsInfo ? oddsInfo.yesPrice : market.yesPrice;
  const noPrice = oddsInfo ? oddsInfo.noPrice : market.noPrice;

  // Show order summary with animation when amount changes
  useEffect(() => {
    if (parseFloat(amount) > 0) {
      setSummaryVisible(true);
    }
  }, [amount]);

  // Clear confetti after animation
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Clear ripple
  useEffect(() => {
    if (ctaRipple) {
      const timer = setTimeout(() => setCtaRipple(null), 600);
      return () => clearTimeout(timer);
    }
  }, [ctaRipple]);

  const handleAmountChange = (value: string) => {
    setInputError(false);
    setAmount(value);
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCtaRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleTrade = async () => {
    if (!connected || !amount) return;

    const amountInAleo = parseFloat(amount);
    if (isNaN(amountInAleo) || amountInAleo <= 0) {
      setInputError(true);
      setTxStatus('error');
      setTxMessage('Please enter a valid amount');
      return;
    }

    setTxStatus('pending');
    setTxMessage('Fetching records & preparing transaction...');

    const option = selectedOutcome === 'yes' ? 1 : 2;

    try {
      setTxMessage('Submitting to wallet...');

      const result = await makePrediction({
        poolId: '1',
        option: option as 1 | 2,
        amount: amountInAleo,
      });

      if (result.status === 'success') {
        setTxStatus('success');
        setTxMessage(`Prediction confirmed! TX: ${result.transactionId?.slice(0, 16)}...`);
        setShowConfetti(true);
        setAmount('');
      } else {
        setTxStatus('error');
        setTxMessage(result.error || 'Transaction failed');
      }
    } catch (e) {
      setTxStatus('error');
      setTxMessage(e instanceof Error ? e.message : 'Transaction failed');
    }
  };

  return (
    <>
      <style>{panelStyles}</style>
      <div
        ref={panelRef}
        className="relative sticky top-[88px] overflow-hidden rounded-2xl"
        style={{ perspective: '1000px' }}
      >
        {/* ── Confetti Overlay ── */}
        <ConfettiBurst active={showConfetti} />

        {/* ── Glass Card Container ── */}
        <div
          className="relative bg-[hsl(230,15%,8%)]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 overflow-hidden transition-all duration-500"
          style={{
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.4),
              0 0 0 1px rgba(255,255,255,0.03),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
          }}
        >
          {/* Grid pattern background */}
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              animation: 'grid-scroll 8s linear infinite',
            }}
          />

          {/* Top neon accent border */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, #3b82f6, #a855f7, #00f0ff, transparent)',
              animation: 'neon-pulse 3s ease-in-out infinite',
            }}
          />

          {/* Holographic accent corner */}
          <div
            className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-10 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #00f0ff, #a855f7, transparent)',
              filter: 'blur(20px)',
            }}
          />

          {/* ── Header ── */}
          <div className="relative flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(168,85,247,0.2))',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}
              >
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Place Order</h2>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </div>
          </div>

          {/* ── Pool Stats ── */}
          {onChainPool && (
            <div
              className="relative rounded-xl p-4 mb-6 space-y-2.5 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <ShimmerBar />
              <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(230,10%,50%)] mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400/60" />
                <span>Pool Stats</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400/70 font-medium ml-auto">
                  ON-CHAIN
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(230,10%,40%)]">Total Staked</span>
                <span className="text-white/90 font-semibold tabular-nums" style={{ animation: 'float-glow 3s ease-in-out infinite' }}>
                  {(onChainPool.total_staked / 1_000_000).toFixed(2)} ALEO
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(230,10%,40%)]">Yes Pool</span>
                <span className="text-blue-400 font-medium tabular-nums">
                  {(onChainPool.option_a_stakes / 1_000_000).toFixed(2)} ALEO
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(230,10%,40%)]">No Pool</span>
                <span className="text-purple-400 font-medium tabular-nums">
                  {(onChainPool.option_b_stakes / 1_000_000).toFixed(2)} ALEO
                </span>
              </div>
              {/* Visual staking bar */}
              <div className="pt-1">
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden flex">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${onChainPool.total_staked > 0 ? (onChainPool.option_a_stakes / onChainPool.total_staked) * 100 : 50}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #00f0ff)',
                      boxShadow: '0 0 8px rgba(59,130,246,0.4)',
                    }}
                  />
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${onChainPool.total_staked > 0 ? (onChainPool.option_b_stakes / onChainPool.total_staked) * 100 : 50}%`,
                      background: 'linear-gradient(90deg, #a855f7, #f43f5e)',
                      boxShadow: '0 0 8px rgba(168,85,247,0.4)',
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-[hsl(230,10%,40%)]">
                <span>{totalPredictions} predictions</span>
              </div>
            </div>
          )}

          {/* ── Outcome Selection ── */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <OutcomeButton
              type="yes"
              price={yesPrice}
              isSelected={selectedOutcome === 'yes'}
              onClick={() => setSelectedOutcome('yes')}
              sparklineData={market.history}
            />
            <OutcomeButton
              type="no"
              price={noPrice}
              isSelected={selectedOutcome === 'no'}
              onClick={() => setSelectedOutcome('no')}
              sparklineData={market.history?.map((v) => 100 - v)}
            />
          </div>

          {/* ── Amount Input ── */}
          <div className="mb-6">
            <label className="text-xs font-medium text-[hsl(230,10%,45%)] mb-2.5 block flex items-center gap-1.5">
              Amount
              <span className="text-[hsl(230,10%,30%)]">(ALEO)</span>
            </label>
            <div
              className={cn(
                'relative rounded-xl transition-all duration-300',
                inputFocused && 'ring-2 ring-blue-500/30',
                inputError && 'ring-2 ring-red-500/40'
              )}
              style={
                inputFocused
                  ? { animation: 'glow-ring 2s ease-in-out infinite' }
                  : inputError
                    ? { animation: 'error-shake 0.5s ease-in-out' }
                    : undefined
              }
            >
              <span
                className={cn(
                  'absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold transition-all duration-300',
                  inputFocused ? 'text-cyan-400' : 'text-[hsl(230,10%,35%)]'
                )}
                style={inputFocused ? { animation: 'float-glow 2s ease-in-out infinite' } : undefined}
              >
                ALEO
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={cn(
                  'w-full bg-white/[0.04] border rounded-xl py-4 pl-16 pr-4 text-white text-lg font-semibold tabular-nums',
                  'placeholder-[hsl(230,10%,25%)] focus:outline-none transition-all duration-300',
                  inputError
                    ? 'border-red-500/40'
                    : inputFocused
                      ? 'border-blue-500/40'
                      : 'border-white/[0.08]'
                )}
              />
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-3">
              {quickAmounts.map((val) => (
                <button
                  key={val}
                  onClick={() => handleAmountChange(val.toString())}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-semibold rounded-lg border transition-all duration-200',
                    'hover:scale-[1.03] active:scale-[0.97]',
                    amount === val.toString()
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      : 'bg-white/[0.03] border-white/[0.06] text-[hsl(230,10%,45%)] hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-white'
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* ── Order Summary ── */}
          {summaryVisible && parseFloat(amount) > 0 && (
            <div
              className="relative rounded-xl p-4 mb-6 space-y-3 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'flip-reveal 0.4s ease-out',
                transformOrigin: 'top center',
              }}
            >
              <ShimmerBar />

              {/* Stat lines with staggered fade-in */}
              <div style={{ animation: 'stat-count-up 0.4s ease-out 0.1s both' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(230,10%,40%)]">Odds</span>
                  <span className="text-white/90 font-semibold tabular-nums">
                    {orderSummary.odds}x
                  </span>
                </div>
              </div>

              <div style={{ animation: 'stat-count-up 0.4s ease-out 0.2s both' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(230,10%,40%)]">Implied Probability</span>
                  <span className="text-white/90 font-semibold tabular-nums">
                    {orderSummary.avgPrice}%
                  </span>
                </div>
              </div>

              <div style={{ animation: 'stat-count-up 0.4s ease-out 0.3s both' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(230,10%,40%)]">Shares</span>
                  <span className="text-white/90 font-semibold tabular-nums">
                    {orderSummary.shares}
                  </span>
                </div>
              </div>

              {/* Position size bar */}
              <div style={{ animation: 'stat-count-up 0.4s ease-out 0.35s both' }}>
                <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min((parseFloat(amount) / 100) * 100, 100)}%`,
                      background:
                        selectedOutcome === 'yes'
                          ? 'linear-gradient(90deg, #3b82f6, #00f0ff)'
                          : 'linear-gradient(90deg, #a855f7, #f43f5e)',
                      boxShadow: `0 0 8px ${selectedOutcome === 'yes' ? 'rgba(59,130,246,0.4)' : 'rgba(168,85,247,0.4)'}`,
                    }}
                  />
                </div>
              </div>

              <div
                className="border-t border-white/[0.06] pt-3 space-y-2"
                style={{ animation: 'stat-count-up 0.4s ease-out 0.4s both' }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[hsl(230,10%,50%)] text-sm">Potential Return</span>
                  <span
                    className="font-bold tabular-nums text-base"
                    style={{
                      background: 'linear-gradient(90deg, #22c55e, #00f0ff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {orderSummary.potentialReturn} ALEO
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(230,10%,40%)]">Profit</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      parseFloat(orderSummary.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {parseFloat(orderSummary.profit) >= 0 ? '+' : ''}
                    {orderSummary.profit} ALEO
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Transaction Status ── */}
          {txStatus !== 'idle' && (
            <div
              className={cn(
                'mb-5 rounded-xl overflow-hidden transition-all duration-300',
                txStatus === 'success' && 'ring-1 ring-emerald-500/20'
              )}
              style={
                txStatus === 'success'
                  ? { animation: 'celebration-glow 2s ease-in-out infinite' }
                  : txStatus === 'error'
                    ? { animation: 'error-shake 0.5s ease-in-out' }
                    : undefined
              }
            >
              {/* Pending State */}
              {txStatus === 'pending' && (
                <div className="relative bg-blue-500/[0.08] border border-blue-500/20 rounded-xl p-4">
                  <ShimmerBar />
                  <div className="flex items-center gap-3">
                    <OrbitalSpinner size={24} />
                    <div>
                      <p className="text-sm font-medium text-blue-400">{txMessage}</p>
                      {/* Multi-step progress */}
                      <div className="flex items-center gap-2 mt-2">
                        {['Prepare', 'Sign', 'Submit', 'Confirm'].map((step, i) => (
                          <div key={step} className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full transition-all duration-300',
                                i === 0
                                  ? 'bg-blue-400'
                                  : txMessage.includes('wallet')
                                    ? i <= 1
                                      ? 'bg-blue-400'
                                      : 'bg-white/10'
                                    : 'bg-white/10'
                              )}
                              style={
                                (i === 0 || (txMessage.includes('wallet') && i <= 1))
                                  ? { animation: 'step-dot-glow 1.5s ease-in-out infinite', color: '#60a5fa' }
                                  : undefined
                              }
                            />
                            <span className="text-[10px] text-white/30">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success State */}
              {txStatus === 'success' && (
                <div className="relative bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div style={{ animation: 'success-bounce 0.5s ease-out' }}>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">Prediction Confirmed!</p>
                      <p className="text-xs text-emerald-400/60 mt-0.5">{txMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {txStatus === 'error' && (
                <div className="relative bg-red-500/[0.08] border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle
                      className="w-5 h-5 text-red-400"
                      style={{ animation: 'warning-pulse 1.5s ease-in-out infinite' }}
                    />
                    <div>
                      <p className="text-sm font-medium text-red-400">{txMessage}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CTA Button ── */}
          {connected ? (
            <button
              onClick={(e) => {
                handleCtaClick(e);
                handleTrade();
              }}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className={cn(
                'relative w-full py-4 rounded-xl font-bold text-base overflow-hidden transition-all duration-300',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
                'hover:scale-[1.01] active:scale-[0.99]',
                'hover:shadow-lg',
                isLoading && 'pointer-events-none',
                txStatus === 'success'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : selectedOutcome === 'yes'
                    ? 'text-white shadow-lg shadow-blue-500/25'
                    : 'text-white shadow-lg shadow-purple-500/25'
              )}
              style={
                txStatus === 'success'
                  ? { background: 'linear-gradient(135deg, #22c55e, #10b981)' }
                  : selectedOutcome === 'yes'
                    ? {
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
                      }
                    : {
                        background: 'linear-gradient(135deg, #a855f7, #7c3aed, #6d28d9)',
                      }
              }
            >
              {/* Shimmer sweep on hover */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  animation: 'shimmer-sweep 2s ease-in-out infinite',
                }}
              />

              {/* Ripple effect */}
              {ctaRipple && (
                <span
                  className="absolute rounded-full bg-white/20 pointer-events-none"
                  style={{
                    left: ctaRipple.x - 20,
                    top: ctaRipple.y - 20,
                    width: 40,
                    height: 40,
                    animation: 'ripple-click 0.6s ease-out',
                  }}
                />
              )}

              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <OrbitalSpinner size={20} />
                    <span>Processing...</span>
                  </>
                ) : txStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" style={{ animation: 'success-bounce 0.5s ease-out' }} />
                    <span>Confirmed!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 opacity-80" />
                    <span>Predict {selectedOutcome === 'yes' ? 'Yes' : 'No'}</span>
                  </>
                )}
              </span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                handleCtaClick(e);
                handleConnectWallet();
              }}
              disabled={connecting}
              className={cn(
                'relative w-full py-4 rounded-xl font-bold text-base text-white overflow-hidden transition-all duration-300',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:scale-[1.01] active:scale-[0.99]',
                'hover:shadow-lg shadow-blue-500/25'
              )}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
              }}
            >
              {/* Shimmer sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  animation: 'shimmer-sweep 2.5s ease-in-out infinite',
                }}
              />

              {/* Ripple effect */}
              {ctaRipple && (
                <span
                  className="absolute rounded-full bg-white/20 pointer-events-none"
                  style={{
                    left: ctaRipple.x - 20,
                    top: ctaRipple.y - 20,
                    width: 40,
                    height: 40,
                    animation: 'ripple-click 0.6s ease-out',
                  }}
                />
              )}

              <span className="relative z-10 flex items-center justify-center gap-2">
                {connecting ? (
                  <>
                    <OrbitalSpinner size={20} />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 opacity-80" />
                    <span>Connect Wallet to Trade</span>
                  </>
                )}
              </span>
            </button>
          )}

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Shield className="w-3 h-3 text-[hsl(230,10%,30%)]" />
            <p className="text-[10px] text-[hsl(230,10%,30%)] font-medium tracking-wide">
              Powered by Aleo Zero-Knowledge Proofs
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Outcome Button ─── */
interface OutcomeButtonProps {
  type: OutcomeType;
  price: number;
  isSelected: boolean;
  onClick: () => void;
  sparklineData?: number[];
}

function OutcomeButton({ type, price, isSelected, onClick, sparklineData }: OutcomeButtonProps) {
  const isYes = type === 'yes';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative py-4 px-3 rounded-xl font-semibold transition-all duration-300 border overflow-hidden group',
        'hover:scale-[1.02] active:scale-[0.97]',
        isSelected
          ? isYes
            ? 'border-blue-500/40 text-white shadow-lg shadow-blue-500/15'
            : 'border-purple-500/40 text-white shadow-lg shadow-purple-500/15'
          : 'bg-white/[0.03] text-[hsl(230,10%,50%)] hover:bg-white/[0.06] border-white/[0.06]'
      )}
      style={
        isSelected
          ? {
              background: isYes
                ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(0,240,255,0.05))'
                : 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(244,63,94,0.05))',
              animation: 'press-3d 0.3s ease-out',
            }
          : undefined
      }
    >
      {/* Neon glow border for selected */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: isYes
              ? 'inset 0 0 20px rgba(59,130,246,0.1), 0 0 20px rgba(59,130,246,0.05)'
              : 'inset 0 0 20px rgba(168,85,247,0.1), 0 0 20px rgba(168,85,247,0.05)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs opacity-60 flex items-center gap-1">
            {isYes ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isYes ? 'Yes' : 'No'}
          </span>
          {sparklineData && (
            <MiniSparkline
              data={sparklineData}
              color={isYes ? '#3b82f6' : '#a855f7'}
            />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-2xl font-bold tabular-nums transition-all duration-300',
              isSelected
                ? isYes
                  ? 'text-white'
                  : 'text-white'
                : 'text-white/70'
            )}
            style={
              isSelected
                ? { animation: 'electric-tick 2s ease-in-out infinite' }
                : undefined
            }
          >
            {price}
            <span className="text-sm opacity-50 ml-0.5">c</span>
          </span>
          <LiquidFillCircle percentage={price} size={36} isYes={isYes} />
        </div>
      </div>
    </button>
  );
}
