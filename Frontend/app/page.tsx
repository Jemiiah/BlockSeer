'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Navbar } from '@/components/navbar';
import { Portfolio } from '@/components/portfolio';
import { MarketCard, MarketFilters, FeaturedMarket } from '@/components/market';
import { useMarkets, useAleoPools } from '@/hooks';

/* ------------------------------------------------------------------ */
/*  Premium Skeleton Card — mesh gradient shimmer + glow pulse edges  */
/* ------------------------------------------------------------------ */
function SkeletonCard({ index = 0 }: { index?: number }) {
  return (
    <div
      className="skeleton-card relative bg-[hsl(230,15%,8%)]/80 border border-white/[0.06] rounded-[24px] pt-6 px-6 pb-6 min-h-[252px] overflow-hidden flex flex-col"
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Mesh gradient shimmer overlay */}
      <div className="skeleton-shimmer absolute inset-0 rounded-[24px] pointer-events-none" />

      {/* Edge glow pulse */}
      <div
        className="skeleton-glow-edge absolute inset-0 rounded-[24px] pointer-events-none"
        style={{ animationDelay: `${index * 200}ms` }}
      />

      {/* Header — badge + live dot */}
      <div className="flex items-start justify-between mb-4">
        <div className="h-5 w-14 skeleton-bone rounded-full" />
        <div className="h-4 w-10 skeleton-bone rounded" />
      </div>

      {/* Title lines */}
      <div className="h-5 w-3/4 skeleton-bone rounded mb-2" />
      <div className="h-4 w-1/2 skeleton-bone rounded mb-5" />

      {/* Volume bar */}
      <div className="h-8 w-28 skeleton-bone rounded-lg mb-5" />

      {/* Outcome buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-14 skeleton-bone-accent rounded-full" />
        <div className="h-14 skeleton-bone rounded-full" />
      </div>

      {/* Footer divider + date */}
      <div className="h-px bg-white/[0.06] mb-3" />
      <div className="h-4 w-24 skeleton-bone rounded" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Orbital Spinner — multi-ring gradient loader + progress count-up  */
/* ------------------------------------------------------------------ */
function OrbitalLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      // Ease-out curve that approaches 90 then hovers
      const t = Math.min(elapsed / 4000, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 90));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Orbital rings */}
      <div className="orbital-container relative w-16 h-16">
        <div className="orbital-ring orbital-ring-1" />
        <div className="orbital-ring orbital-ring-2" />
        <div className="orbital-ring orbital-ring-3" />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 orbital-core-pulse" />
        </div>
      </div>

      {/* Progress count */}
      <div className="text-sm font-medium tabular-nums text-white/40">
        {progress}%
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Top Loading Bar — neon gradient progress indicator                 */
/* ------------------------------------------------------------------ */
function TopLoadingBar({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] overflow-hidden">
      <div className="top-loading-bar h-full w-full" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market');
  const { connected: isConnected } = useWallet();
  const [hasLoaded, setHasLoaded] = useState(false);
  const prevLoadingRef = useRef(true);

  // Fetch pools from backend API
  const { pools, isLoading: isLoadingPools, error } = useAleoPools();

  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filteredMarkets,
    liveCount,
    upcomingCount,
  } = useMarkets(pools);

  // Track skeleton -> content transition
  useEffect(() => {
    if (prevLoadingRef.current && !isLoadingPools) {
      setHasLoaded(true);
    }
    prevLoadingRef.current = isLoadingPools;
  }, [isLoadingPools]);

  const handleLogoClick = () => {
    setActiveTab('market');
  };

  const handleTabChange = (tab: 'market' | 'portfolio') => {
    setActiveTab(tab);
  };

  return (
    <>
      {/* Top neon loading bar */}
      <TopLoadingBar isLoading={isLoadingPools} />

      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogoClick={handleLogoClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === 'portfolio' ? (
          <Portfolio isConnected={isConnected} />
        ) : (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="gradient-text">Prediction Markets</span>
              </h1>
              <p className="text-[hsl(230,10%,50%)] text-lg">
                Trade on crypto events with zero-knowledge privacy on Aleo.
              </p>
              {error && (
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-red-400/70 text-sm">
                    Error loading markets: {error}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Filters */}
            <MarketFilters
              activeFilter={filter}
              onFilterChange={setFilter}
              liveCount={liveCount}
              upcomingCount={upcomingCount}
            />

            {/* Featured Market */}
            <FeaturedMarket markets={pools} />

            {/* Loading State — premium skeleton grid + orbital spinner */}
            {isLoadingPools ? (
              <div className="loading-container">
                {/* Orbital loader above the grid */}
                <OrbitalLoader />

                {/* Stagger-reveal skeleton grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} index={i} />
                  ))}
                </div>
              </div>
            ) : filteredMarkets.length === 0 ? (
              /* Empty State */
              <div className={`flex flex-col items-center justify-center py-20 text-center ${hasLoaded ? 'content-reveal' : ''}`}>
                <p className="text-[hsl(230,10%,50%)] text-lg mb-2">No markets found</p>
                <p className="text-[hsl(230,10%,35%)] text-sm">
                  {pools.length === 0
                    ? "No prediction markets available yet."
                    : "No markets match your current filter."}
                </p>
              </div>
            ) : (
              /* Market Grid — stagger spiral-in with cross-fade from skeleton */
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${hasLoaded ? 'content-reveal' : ''}`}>
                {filteredMarkets.map((market, index) => (
                  <div
                    key={market.id}
                    className="market-card-entrance"
                    style={{
                      animationDelay: `${Math.min(index * 70, 700)}ms`,
                    }}
                  >
                    <MarketCard market={market} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- Premium loading CSS (all CSS animations, 60fps, reduced-motion safe) --- */}
      <style jsx global>{`
        /* ========================= */
        /*  Mesh Gradient Shimmer     */
        /* ========================= */
        @keyframes skeleton-shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .skeleton-shimmer {
          background: linear-gradient(
            105deg,
            transparent 30%,
            hsla(217, 91%, 60%, 0.04) 40%,
            hsla(263, 70%, 60%, 0.06) 50%,
            hsla(190, 80%, 55%, 0.04) 60%,
            transparent 70%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 2s ease-in-out infinite;
        }

        /* ========================= */
        /*  Edge Glow Pulse           */
        /* ========================= */
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: inset 0 0 0 1px hsla(217, 91%, 60%, 0),
                        0 0 0 0 hsla(263, 70%, 60%, 0);
          }
          50% {
            box-shadow: inset 0 0 0 1px hsla(217, 91%, 60%, 0.08),
                        0 0 20px -4px hsla(263, 70%, 60%, 0.06);
          }
        }

        .skeleton-glow-edge {
          animation: glow-pulse 3s ease-in-out infinite;
        }

        /* ========================= */
        /*  Skeleton Bone Elements    */
        /* ========================= */
        @keyframes bone-wave {
          0% {
            opacity: 0.06;
          }
          50% {
            opacity: 0.1;
          }
          100% {
            opacity: 0.06;
          }
        }

        .skeleton-bone {
          background: hsla(230, 15%, 100%, 0.06);
          animation: bone-wave 2s ease-in-out infinite;
        }

        .skeleton-bone-accent {
          background: hsla(217, 91%, 60%, 0.05);
          animation: bone-wave 2s ease-in-out infinite;
        }

        /* ========================= */
        /*  Stagger Reveal (cards)    */
        /* ========================= */
        @keyframes skeleton-stagger-in {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .skeleton-card {
          opacity: 0;
          animation: skeleton-stagger-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* ========================= */
        /*  Orbital Spinner           */
        /* ========================= */
        .orbital-container {
          perspective: 200px;
        }

        @keyframes orbit-1 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes orbit-2 {
          0% { transform: rotate(60deg) rotateX(60deg); }
          100% { transform: rotate(420deg) rotateX(60deg); }
        }

        @keyframes orbit-3 {
          0% { transform: rotate(120deg) rotateX(-60deg); }
          100% { transform: rotate(480deg) rotateX(-60deg); }
        }

        @keyframes core-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 8px hsla(217, 91%, 60%, 0.4);
          }
          50% {
            transform: scale(1.3);
            box-shadow: 0 0 16px hsla(263, 70%, 60%, 0.6);
          }
        }

        .orbital-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
        }

        .orbital-ring-1 {
          border-top-color: hsl(217, 91%, 60%);
          border-right-color: hsla(217, 91%, 60%, 0.3);
          animation: orbit-1 1.4s linear infinite;
        }

        .orbital-ring-2 {
          inset: 4px;
          border-top-color: hsl(263, 70%, 60%);
          border-right-color: hsla(263, 70%, 60%, 0.3);
          animation: orbit-2 1.8s linear infinite;
        }

        .orbital-ring-3 {
          inset: 8px;
          border-top-color: hsl(190, 80%, 55%);
          border-right-color: hsla(190, 80%, 55%, 0.3);
          animation: orbit-3 2.2s linear infinite;
        }

        .orbital-core-pulse {
          animation: core-pulse 2s ease-in-out infinite;
        }

        /* ========================= */
        /*  Top Loading Bar (neon)    */
        /* ========================= */
        @keyframes loading-bar-slide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .top-loading-bar {
          background: linear-gradient(
            90deg,
            transparent,
            hsl(217, 91%, 60%),
            hsl(263, 70%, 60%),
            hsl(330, 80%, 60%),
            hsl(190, 80%, 55%),
            transparent
          );
          animation: loading-bar-slide 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 0 12px hsla(217, 91%, 60%, 0.4),
                      0 0 24px hsla(263, 70%, 60%, 0.2);
        }

        /* ========================= */
        /*  Content Cross-Fade Reveal */
        /* ========================= */
        @keyframes content-cross-fade {
          0% {
            opacity: 0;
            filter: blur(4px);
            transform: scale(0.98);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
            transform: scale(1);
          }
        }

        .content-reveal {
          animation: content-cross-fade 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* ========================= */
        /*  Market Card Spiral-In     */
        /* ========================= */
        @keyframes spiral-in {
          0% {
            opacity: 0;
            transform: translateY(20px) rotate(-2deg) scale(0.95);
          }
          60% {
            opacity: 1;
            transform: translateY(-2px) rotate(0.5deg) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
        }

        .market-card-entrance {
          opacity: 0;
          animation: spiral-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* ========================= */
        /*  Reduced Motion            */
        /* ========================= */
        @media (prefers-reduced-motion: reduce) {
          .skeleton-shimmer,
          .skeleton-glow-edge,
          .skeleton-bone,
          .skeleton-bone-accent,
          .orbital-ring-1,
          .orbital-ring-2,
          .orbital-ring-3,
          .orbital-core-pulse,
          .top-loading-bar {
            animation: none !important;
          }

          .skeleton-card {
            opacity: 1;
            animation: none !important;
          }

          .skeleton-bone {
            opacity: 0.08;
          }

          .skeleton-bone-accent {
            opacity: 0.06;
          }

          .content-reveal {
            animation: none !important;
            opacity: 1;
            filter: none;
            transform: none;
          }

          .market-card-entrance {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </>
  );
}
