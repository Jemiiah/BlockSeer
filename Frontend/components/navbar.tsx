'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, LogOut, Copy, Check, Search, X, Settings, BarChart3, Store, Zap, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { cn, truncateAddress } from '@/lib/utils';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useWalletBalance } from '@/hooks/use-wallet-balance';

interface NavbarProps {
  activeTab: 'market' | 'portfolio';
  onTabChange: (tab: 'market' | 'portfolio') => void;
  onLogoClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 'aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd';

export function Navbar({
  activeTab,
  onTabChange,
  onLogoClick,
  searchQuery = '',
  onSearchChange,
}: NavbarProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { address: walletAddress, connected, connecting, disconnect } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { balance: walletBalance, isLoading: balanceLoading } = useWalletBalance();
  const address = walletAddress || '';

  // Auto-connect can get stuck in "connecting" state if wallet extension
  // isn't responding. Time it out so the user can still interact.
  const [connectingTimedOut, setConnectingTimedOut] = useState(false);
  useEffect(() => {
    if (connecting) {
      setConnectingTimedOut(false);
      const timer = setTimeout(() => setConnectingTimedOut(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [connecting]);

  const showConnecting = connecting && !connectingTimedOut && !connected;

  const handleConnect = () => setWalletModalVisible(true);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simple sticky behavior
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Escape key closes account menu
  useEffect(() => {
    if (!showAccountMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAccountMenu(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAccountMenu]);

  const closeAccountMenu = useCallback(() => setShowAccountMenu(false), []);

  return (
    <>
      <nav
        className={cn(
          'sticky top-0 z-50 transition-shadow duration-300',
          'border-b border-white/[0.06]',
          'bg-[hsl(230,15%,5%)]/90 backdrop-blur-xl',
          scrolled && 'shadow-lg'
        )}
      >
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="flex items-center cursor-pointer shrink-0" onClick={onLogoClick}>
                <span className="text-lg font-bold tracking-tight text-white">
                  Mani<span className="gradient-text">fold</span>
                </span>
              </div>

              {/* Navigation Tabs */}
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => onTabChange('market')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                    activeTab === 'market'
                      ? 'text-white bg-white/[0.06]'
                      : 'text-[hsl(230,10%,55%)] hover:text-white/80'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Markets
                  </span>
                </button>
                <button
                  onClick={() => onTabChange('portfolio')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                    activeTab === 'portfolio'
                      ? 'text-white bg-white/[0.06]'
                      : 'text-[hsl(230,10%,55%)] hover:text-white/80'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Portfolio
                  </span>
                </button>
              </div>
            </div>

            {/* Center: Search Bar */}
            {activeTab === 'market' && (
              <div className="hidden lg:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <Search
                    className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200',
                      isSearchFocused ? 'text-blue-400' : 'text-[hsl(230,10%,40%)]'
                    )}
                  />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={cn(
                      'w-full rounded-xl pl-10 pr-10 py-2 text-sm text-white transition-colors duration-200',
                      'placeholder:text-[hsl(230,10%,40%)] focus:outline-none',
                      isSearchFocused
                        ? 'bg-white/[0.08] border border-blue-500/30'
                        : 'bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1]'
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

            {/* Right: Stats & Wallet */}
            <div className="flex items-center gap-2 sm:gap-4">
              {connected && address ? (
                <>
                  {/* Portfolio Stats */}
                  <div className="hidden lg:flex items-center gap-3 mr-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-blue-500/[0.06] border-blue-500/[0.12]">
                      <Wallet className="w-3.5 h-3.5 text-blue-400" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-blue-400/60 leading-none">Balance</span>
                        <span className="text-sm font-semibold text-white font-mono tabular-nums">
                          {balanceLoading ? '...' : `${walletBalance.toFixed(2)} ALEO`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Account Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAccountMenu(!showAccountMenu)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-200',
                        'bg-white/[0.04] border hover:bg-white/[0.08]',
                        showAccountMenu ? 'border-blue-500/30' : 'border-white/[0.06]'
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-sm font-mono text-white">{truncateAddress(address)}</span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 text-[hsl(230,10%,55%)] transition-transform duration-200',
                          showAccountMenu && 'rotate-180'
                        )}
                      />
                    </button>

                    {showAccountMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={closeAccountMenu} />
                        <div className="absolute right-0 mt-2 w-60 z-50 overflow-hidden rounded-xl border border-white/[0.08] bg-[hsl(230,15%,10%)]/95 backdrop-blur-xl shadow-xl">
                          <div className="px-4 py-3 border-b border-white/[0.06]">
                            <p className="text-[10px] uppercase tracking-wider text-blue-400/60 mb-1 font-medium">Connected (Aleo)</p>
                            <p className="text-sm font-mono text-white break-all">{truncateAddress(address)}</p>
                          </div>
                          <div className="p-2">
                            <button
                              onClick={handleCopyAddress}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              {copied ? 'Copied!' : 'Copy Address'}
                            </button>
                            {address === ADMIN_ADDRESS && (
                              <Link
                                href="/admin"
                                onClick={closeAccountMenu}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-400 hover:bg-white/[0.06] rounded-lg transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                                Admin Panel
                              </Link>
                            )}
                            <button
                              onClick={() => {
                                disconnect();
                                closeAccountMenu();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/[0.08] rounded-lg transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* Wallet Connect Button */
                <button
                  onClick={handleConnect}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200',
                    'bg-blue-500 text-white hover:bg-blue-600',
                    showConnecting && 'opacity-70 cursor-wait'
                  )}
                >
                  {showConnecting ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Connect Wallet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          {activeTab === 'market' && (
            <div className="lg:hidden pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(230,10%,40%)]" />
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-10 py-2 text-sm text-white bg-white/[0.04] border border-white/[0.06] placeholder:text-[hsl(230,10%,40%)] focus:outline-none focus:border-blue-500/30"
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

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[hsl(230,15%,5%)]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => onTabChange('market')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 transition-colors duration-200',
              activeTab === 'market' ? 'text-blue-400' : 'text-[hsl(230,10%,40%)]'
            )}
          >
            <Store className="w-5 h-5" />
            <span className="text-xs font-medium">Markets</span>
          </button>
          <button
            onClick={() => onTabChange('portfolio')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 transition-colors duration-200',
              activeTab === 'portfolio' ? 'text-violet-400' : 'text-[hsl(230,10%,40%)]'
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-medium">Portfolio</span>
          </button>
        </div>
      </div>
    </>
  );
}
