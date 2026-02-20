'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, LogOut, Copy, Check, Search, X, Settings, BarChart3, Store, Zap, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { cn, truncateAddress } from '@/lib/utils';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';

interface NavbarProps {
  activeTab: 'market' | 'portfolio';
  onTabChange: (tab: 'market' | 'portfolio') => void;
  onLogoClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  stats?: {
    totalValue: number;
    cash: number;
  };
}

// Admin address - only this wallet can access admin panel
const ADMIN_ADDRESS = 'aleo1jl3q3uywtdzlr8dln65xjc2mr7vwa2pm9fsenq49zsgsz5a8pqzs0j7cj5';

export function Navbar({
  activeTab,
  onTabChange,
  onLogoClick,
  searchQuery = '',
  onSearchChange,
  stats = { totalValue: 0, cash: 0 }
}: NavbarProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [logoHovered, setLogoHovered] = useState(false);
  const [prevStats, setPrevStats] = useState(stats);
  const [statsFlash, setStatsFlash] = useState<{ portfolio: boolean; cash: boolean }>({ portfolio: false, cash: false });
  const [menuAnimating, setMenuAnimating] = useState(false);

  const navRef = useRef<HTMLElement>(null);

  const { address: walletAddress, connected, connecting, disconnect } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const address = walletAddress || '';

  const handleConnect = () => {
    setWalletModalVisible(true);
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Scroll-reactive effects
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      setScrolled(y > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stats change flash effect
  useEffect(() => {
    const flashes = { portfolio: false, cash: false };
    if (prevStats.totalValue !== stats.totalValue) flashes.portfolio = true;
    if (prevStats.cash !== stats.cash) flashes.cash = true;
    if (flashes.portfolio || flashes.cash) {
      setStatsFlash(flashes);
      setPrevStats(stats);
      const timer = setTimeout(() => setStatsFlash({ portfolio: false, cash: false }), 800);
      return () => clearTimeout(timer);
    }
  }, [stats, prevStats]);

  // Escape key closes account menu
  useEffect(() => {
    if (!showAccountMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAccountMenu(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAccountMenu]);

  // Account menu open with animation
  const openAccountMenu = useCallback(() => {
    setMenuAnimating(true);
    setShowAccountMenu(true);
  }, []);

  const closeAccountMenu = useCallback(() => {
    setShowAccountMenu(false);
    setMenuAnimating(false);
  }, []);

  // Dynamic blur intensity based on scroll
  const blurIntensity = Math.min(24 + scrollY * 0.3, 40);
  const navScale = scrolled ? 0.98 : 1;
  const navHeight = scrolled ? 'h-14' : 'h-16';
  const glowOpacity = Math.min(0.15 + scrollY * 0.003, 0.5);

  return (
    <>
      <nav
        ref={navRef}
        className={cn(
          'sticky top-0 z-50 transition-all duration-500 ease-out',
          scrolled && 'shadow-2xl'
        )}
        style={{
          backdropFilter: `blur(${blurIntensity}px) saturate(1.4)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px) saturate(1.4)`,
          transform: `scale(${navScale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Animated gradient border - top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden"
          style={{ opacity: 0.6 + glowOpacity }}
        >
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, #ec4899, #06b6d4, #3b82f6, transparent)',
              backgroundSize: '200% 100%',
              animation: 'nav-gradient-slide 4s linear infinite',
            }}
          />
        </div>

        {/* Glass background */}
        <div
          className="absolute inset-0 border-b border-white/[0.06]"
          style={{
            background: `linear-gradient(180deg, hsla(230, 15%, 5%, ${0.75 + scrollY * 0.002}) 0%, hsla(230, 15%, 5%, ${0.85 + scrollY * 0.002}) 100%)`,
          }}
        />

        {/* Glow shadow that strengthens on scroll */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: `0 4px 30px -10px rgba(59, 130, 246, ${glowOpacity}), 0 2px 15px -5px rgba(139, 92, 246, ${glowOpacity * 0.7})`,
          }}
        />

        <div className="relative w-full px-4 sm:px-6 lg:px-8">
          <div className={cn('flex items-center justify-between transition-all duration-500', navHeight)}>
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-8">
              {/* Holographic Logo */}
              <div
                className="flex items-center cursor-pointer shrink-0 relative group"
                onClick={onLogoClick}
                onMouseEnter={() => setLogoHovered(true)}
                onMouseLeave={() => setLogoHovered(false)}
              >
                <span className={cn(
                  'text-lg font-bold tracking-tight text-white transition-all duration-300',
                  logoHovered && 'scale-105'
                )}>
                  Mani
                  <span
                    className="relative inline-block"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #06b6d4, #3b82f6)',
                      backgroundSize: '300% 300%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'nav-holographic 4s ease-in-out infinite',
                    }}
                  >
                    fold
                  </span>
                </span>
                {/* Electric pulse on hover */}
                {logoHovered && (
                  <span
                    className="absolute -inset-2 rounded-lg pointer-events-none"
                    style={{
                      boxShadow: '0 0 15px rgba(59, 130, 246, 0.3), 0 0 30px rgba(139, 92, 246, 0.15)',
                      animation: 'nav-pulse-glow 1s ease-in-out infinite',
                    }}
                  />
                )}
                {/* Glitch effect on hover */}
                {logoHovered && (
                  <span
                    className="absolute inset-0 flex items-center pointer-events-none opacity-30"
                    style={{ animation: 'nav-glitch 0.3s ease-in-out' }}
                  >
                    <span className="text-lg font-bold tracking-tight">
                      Mani<span className="text-cyan-400">fold</span>
                    </span>
                  </span>
                )}
              </div>

              {/* Navigation Tabs with Magnetic Easing */}
              <div className="hidden md:flex items-center gap-1 relative">
                {/* Sliding neon underline */}
                <div
                  className="absolute bottom-0 h-[2px] transition-all duration-500 rounded-full"
                  style={{
                    left: activeTab === 'market' ? '0px' : '50%',
                    width: '50%',
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    boxShadow: '0 0 8px rgba(59, 130, 246, 0.6), 0 0 16px rgba(139, 92, 246, 0.3)',
                    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />
                {/* Background glow follows active tab */}
                <div
                  className="absolute inset-y-0 transition-all duration-500 rounded-lg pointer-events-none"
                  style={{
                    left: activeTab === 'market' ? '0px' : '50%',
                    width: '50%',
                    background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
                    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                />

                <button
                  onClick={() => onTabChange('market')}
                  className={cn(
                    'relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 group/tab',
                    activeTab === 'market'
                      ? 'text-white'
                      : 'text-[hsl(230,10%,55%)] hover:text-white/80'
                  )}
                  style={{
                    transform: activeTab === 'market' ? 'translateY(0)' : undefined,
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Store
                      className={cn(
                        'w-4 h-4 transition-all duration-500',
                        activeTab === 'market' ? 'text-blue-400' : 'text-[hsl(230,10%,55%)] group-hover/tab:text-white/60'
                      )}
                      style={{
                        transform: activeTab === 'market' ? 'rotate(0deg)' : 'rotate(-10deg)',
                        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                    Markets
                  </span>
                </button>
                <button
                  onClick={() => onTabChange('portfolio')}
                  className={cn(
                    'relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 group/tab',
                    activeTab === 'portfolio'
                      ? 'text-white'
                      : 'text-[hsl(230,10%,55%)] hover:text-white/80'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <BarChart3
                      className={cn(
                        'w-4 h-4 transition-all duration-500',
                        activeTab === 'portfolio' ? 'text-violet-400' : 'text-[hsl(230,10%,55%)] group-hover/tab:text-white/60'
                      )}
                      style={{
                        transform: activeTab === 'portfolio' ? 'rotate(0deg)' : 'rotate(10deg)',
                        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                    Portfolio
                  </span>
                </button>
              </div>
            </div>

            {/* Center: Cyberpunk Search Bar */}
            {activeTab === 'market' && (
              <div className="hidden lg:flex flex-1 max-w-md mx-8">
                <div
                  className={cn(
                    'relative w-full transition-all duration-500',
                    isSearchFocused ? 'scale-[1.02]' : 'scale-100'
                  )}
                >
                  {/* Neon glow ring on focus */}
                  {isSearchFocused && (
                    <div
                      className="absolute -inset-[2px] rounded-xl pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.4))',
                        animation: 'nav-search-pulse 2s ease-in-out infinite',
                        filter: 'blur(1px)',
                      }}
                    />
                  )}
                  <Search
                    className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300',
                      isSearchFocused ? 'text-cyan-400' : 'text-[hsl(230,10%,40%)]',
                      searchQuery && isSearchFocused && 'animate-spin'
                    )}
                    style={{
                      animationDuration: searchQuery && isSearchFocused ? '2s' : undefined,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={cn(
                      'relative w-full rounded-xl pl-10 pr-10 py-2 text-sm text-white transition-all duration-300',
                      'placeholder:text-[hsl(230,10%,40%)] focus:outline-none',
                      isSearchFocused
                        ? 'bg-white/[0.08] border border-cyan-500/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]'
                        : 'bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1]'
                    )}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange?.('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(230,10%,40%)] hover:text-white/70 transition-all duration-200"
                      style={{ animation: 'nav-rotate-in 0.3s ease-out' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Right: Stats & Wallet */}
            <div className="flex items-center gap-2 sm:gap-4">
              {connected && address ? (
                <>
                  {/* Glowing Portfolio Stats */}
                  <div className="hidden lg:flex items-center gap-3 mr-2">
                    {/* Portfolio metric card */}
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300',
                        'bg-gradient-to-r from-emerald-500/[0.06] to-emerald-500/[0.02]',
                        'border-emerald-500/[0.12] hover:border-emerald-500/[0.25]',
                        'hover:shadow-[0_0_12px_-3px_rgba(16,185,129,0.2)]',
                        'group/stat cursor-default'
                      )}
                    >
                      <TrendingUp className={cn(
                        'w-3.5 h-3.5 text-emerald-400 transition-transform duration-300',
                        'group-hover/stat:scale-110'
                      )} />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-emerald-400/60 leading-none">Portfolio</span>
                        <span
                          className={cn(
                            'text-sm font-semibold text-emerald-400 font-mono tabular-nums transition-all duration-300',
                            statsFlash.portfolio && 'nav-stat-flash'
                          )}
                        >
                          ${stats.totalValue.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Cash metric card */}
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300',
                        'bg-gradient-to-r from-blue-500/[0.06] to-violet-500/[0.02]',
                        'border-blue-500/[0.12] hover:border-blue-500/[0.25]',
                        'hover:shadow-[0_0_12px_-3px_rgba(59,130,246,0.2)]',
                        'group/stat cursor-default'
                      )}
                    >
                      <Wallet className={cn(
                        'w-3.5 h-3.5 text-blue-400 transition-transform duration-300',
                        'group-hover/stat:scale-110'
                      )} />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-blue-400/60 leading-none">Cash</span>
                        <span
                          className={cn(
                            'text-sm font-semibold text-white font-mono tabular-nums transition-all duration-300',
                            statsFlash.cash && 'nav-stat-flash'
                          )}
                        >
                          ${stats.cash.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Account Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => showAccountMenu ? closeAccountMenu() : openAccountMenu()}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300',
                        'bg-white/[0.04] border hover:bg-white/[0.08]',
                        showAccountMenu
                          ? 'border-emerald-500/30 shadow-[0_0_12px_-3px_rgba(16,185,129,0.2)]'
                          : 'border-white/[0.06] hover:border-white/[0.12]'
                      )}
                    >
                      <span
                        className="relative w-2 h-2 rounded-full bg-emerald-400"
                      >
                        <span
                          className="absolute inset-0 rounded-full bg-emerald-400"
                          style={{ animation: 'nav-pulse-ring 2s ease-out infinite' }}
                        />
                      </span>
                      <span className="text-sm font-mono text-white">{truncateAddress(address)}</span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 text-[hsl(230,10%,55%)] transition-transform duration-300',
                          showAccountMenu && 'rotate-180'
                        )}
                      />
                    </button>

                    {showAccountMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={closeAccountMenu}
                        />
                        {/* Glass dropdown panel with 3D slide-down */}
                        <div
                          className="absolute right-0 mt-2 w-60 z-50 overflow-hidden rounded-xl border border-white/[0.08]"
                          style={{
                            background: 'linear-gradient(180deg, hsla(230, 15%, 10%, 0.95) 0%, hsla(230, 15%, 8%, 0.98) 100%)',
                            backdropFilter: 'blur(20px) saturate(1.5)',
                            WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(59, 130, 246, 0.1)',
                            animation: 'nav-dropdown-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            transformOrigin: 'top right',
                          }}
                        >
                          <div className="px-4 py-3 border-b border-white/[0.06]">
                            <p className="text-[10px] uppercase tracking-wider text-cyan-400/60 mb-1 font-medium">Connected (Aleo)</p>
                            <p className="text-sm font-mono text-white break-all">{truncateAddress(address)}</p>
                          </div>
                          <div className="p-2">
                            <button
                              onClick={handleCopyAddress}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] rounded-lg transition-all duration-200 hover:text-white group/item"
                              style={{ animation: 'nav-stagger-item 0.3s ease-out backwards', animationDelay: '0.05s' }}
                            >
                              {copied ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4 transition-transform duration-200 group-hover/item:scale-110" />
                              )}
                              {copied ? 'Copied!' : 'Copy Address'}
                            </button>
                            {address === ADMIN_ADDRESS && (
                              <Link
                                href="/admin"
                                onClick={closeAccountMenu}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-400 hover:bg-white/[0.06] rounded-lg transition-all duration-200 hover:text-blue-300 group/item"
                                style={{ animation: 'nav-stagger-item 0.3s ease-out backwards', animationDelay: '0.1s' }}
                              >
                                <Settings className="w-4 h-4 transition-transform duration-200 group-hover/item:rotate-90" />
                                Admin Panel
                              </Link>
                            )}
                            <button
                              onClick={() => {
                                disconnect();
                                closeAccountMenu();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/[0.08] rounded-lg transition-all duration-200 hover:text-red-300 group/item"
                              style={{ animation: 'nav-stagger-item 0.3s ease-out backwards', animationDelay: '0.15s' }}
                            >
                              <LogOut className="w-4 h-4 transition-transform duration-200 group-hover/item:translate-x-0.5" />
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* Wallet Connect Button - Gradient shimmer border when not connected, orbital spinner when connecting */
                <div className="relative group/wallet">
                  {/* Shimmer border effect */}
                  {!connecting && (
                    <div
                      className="absolute -inset-[1px] rounded-xl opacity-50 group-hover/wallet:opacity-100 transition-opacity duration-300"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #06b6d4)',
                        backgroundSize: '300% 300%',
                        animation: 'nav-border-shimmer 3s ease-in-out infinite',
                      }}
                    />
                  )}
                  {/* Orbital spinner when connecting */}
                  {connecting && (
                    <div
                      className="absolute -inset-[2px] rounded-xl"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent, #3b82f6, #8b5cf6, transparent)',
                        animation: 'nav-orbital-spin 1.5s linear infinite',
                      }}
                    />
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                      'bg-[hsl(230,15%,8%)]',
                      connecting
                        ? 'text-white/60 cursor-wait'
                        : 'text-white hover:text-white hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02]'
                    )}
                  >
                    {connecting ? (
                      <>
                        <span
                          className="w-2 h-2 rounded-full bg-blue-400"
                          style={{ animation: 'nav-connecting-dot 1s ease-in-out infinite' }}
                        />
                        <span
                          style={{
                            background: 'linear-gradient(90deg, #fff 0%, #fff 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            animation: 'nav-shimmer-text 1.5s ease-in-out infinite',
                          }}
                        >
                          Connecting...
                        </span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-blue-400" />
                        Connect Wallet
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          {activeTab === 'market' && (
            <div className="lg:hidden pb-3">
              <div className="relative">
                <Search className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300',
                  isSearchFocused ? 'text-cyan-400' : 'text-[hsl(230,10%,40%)]'
                )} />
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className={cn(
                    'w-full rounded-xl pl-10 pr-10 py-2 text-sm text-white transition-all duration-300',
                    'placeholder:text-[hsl(230,10%,40%)] focus:outline-none',
                    isSearchFocused
                      ? 'bg-white/[0.08] border border-cyan-500/30'
                      : 'bg-white/[0.04] border border-white/[0.06]'
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(230,10%,40%)] hover:text-white/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar - Cyberpunk */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
        style={{
          background: 'linear-gradient(180deg, hsla(230, 15%, 5%, 0.92) 0%, hsla(230, 15%, 5%, 0.98) 100%)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        }}
      >
        {/* Top gradient edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), rgba(139,92,246,0.3), transparent)',
          }}
        />
        <div className="flex items-center justify-around h-14 relative">
          {/* Sliding active indicator */}
          <div
            className="absolute top-0 h-[2px] w-16 transition-all duration-500 rounded-full"
            style={{
              left: activeTab === 'market' ? 'calc(25% - 32px)' : 'calc(75% - 32px)',
              background: activeTab === 'market'
                ? 'linear-gradient(90deg, #3b82f6, #06b6d4)'
                : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
              boxShadow: activeTab === 'market'
                ? '0 0 10px rgba(59, 130, 246, 0.5)'
                : '0 0 10px rgba(139, 92, 246, 0.5)',
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
          <button
            onClick={() => onTabChange('market')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 transition-all duration-300',
              activeTab === 'market' ? 'text-blue-400 scale-105' : 'text-[hsl(230,10%,40%)] hover:text-white/50'
            )}
          >
            <Store
              className="w-5 h-5 transition-transform duration-500"
              style={{
                transform: activeTab === 'market' ? 'rotate(0deg) scale(1.1)' : 'rotate(-5deg)',
                filter: activeTab === 'market' ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))' : 'none',
              }}
            />
            <span className="text-xs font-medium">Markets</span>
          </button>
          <button
            onClick={() => onTabChange('portfolio')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 transition-all duration-300',
              activeTab === 'portfolio' ? 'text-violet-400 scale-105' : 'text-[hsl(230,10%,40%)] hover:text-white/50'
            )}
          >
            <BarChart3
              className="w-5 h-5 transition-transform duration-500"
              style={{
                transform: activeTab === 'portfolio' ? 'rotate(0deg) scale(1.1)' : 'rotate(5deg)',
                filter: activeTab === 'portfolio' ? 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.4))' : 'none',
              }}
            />
            <span className="text-xs font-medium">Portfolio</span>
          </button>
        </div>
      </div>

      {/* Scoped Keyframes */}
      <style jsx>{`
        @keyframes nav-gradient-slide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes nav-holographic {
          0%, 100% { background-position: 0% 50%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
        }
        @keyframes nav-pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes nav-glitch {
          0% { transform: translate(0); clip-path: inset(0 0 100% 0); }
          20% { transform: translate(-2px, 1px); clip-path: inset(20% 0 60% 0); }
          40% { transform: translate(2px, -1px); clip-path: inset(40% 0 20% 0); }
          60% { transform: translate(-1px, 2px); clip-path: inset(60% 0 10% 0); }
          80% { transform: translate(1px, -1px); clip-path: inset(10% 0 80% 0); }
          100% { transform: translate(0); clip-path: inset(0 0 100% 0); }
        }
        @keyframes nav-search-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes nav-rotate-in {
          0% { transform: translateY(-50%) rotate(90deg) scale(0.5); opacity: 0; }
          100% { transform: translateY(-50%) rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes nav-pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes nav-dropdown-enter {
          0% { opacity: 0; transform: translateY(-8px) scale(0.95) perspective(600px) rotateX(-5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) perspective(600px) rotateX(0deg); }
        }
        @keyframes nav-stagger-item {
          0% { opacity: 0; transform: translateX(8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes nav-border-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes nav-orbital-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes nav-connecting-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes nav-shimmer-text {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .nav-stat-flash {
          animation: nav-stat-flash-anim 0.8s ease-out;
        }
        @keyframes nav-stat-flash-anim {
          0% { color: #fff; text-shadow: 0 0 8px rgba(255, 255, 255, 0.6); transform: scale(1.08); }
          100% { text-shadow: none; transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}
