'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, LogOut, Copy, Check, Search, X, Settings, BarChart3, Store } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { cn, truncateAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

  useEffect(() => {
    if (!showAccountMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAccountMenu(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAccountMenu]);

  return (
    <>
      <nav className="border-b border-white/[0.06] backdrop-blur-xl bg-[hsl(230,15%,5%)]/80 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center gap-8">
              <div className="flex items-center cursor-pointer shrink-0" onClick={onLogoClick}>
                <span className="text-lg font-bold tracking-tight text-white">
                  Mani<span className="gradient-text">fold</span>
                </span>
              </div>

              {/* Nav Links */}
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => onTabChange('market')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === 'market'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-[hsl(230,10%,55%)] hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  Markets
                </button>
                <button
                  onClick={() => onTabChange('portfolio')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === 'portfolio'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-[hsl(230,10%,55%)] hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  Portfolio
                </button>
              </div>
            </div>

            {/* Center: Search Bar */}
            {activeTab === 'market' && (
              <div className="hidden lg:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(230,10%,40%)]" />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder:text-[hsl(230,10%,40%)] focus:outline-none focus:border-white/[0.12] focus:ring-1 focus:ring-white/[0.08] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange?.('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(230,10%,40%)] hover:text-white/70"
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
                  {/* Portfolio & Cash Stats */}
                  <div className="hidden lg:flex items-center gap-6 mr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(230,10%,40%)]">Portfolio</span>
                      <span className="text-sm font-semibold text-emerald-400 font-mono">
                        ${stats.totalValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(230,10%,40%)]">Cash</span>
                      <span className="text-sm font-semibold text-white font-mono">
                        ${stats.cash.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Connected Account Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAccountMenu(!showAccountMenu)}
                      className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.08] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-sm font-mono text-white">{truncateAddress(address)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-[hsl(230,10%,55%)]" />
                    </button>

                    {showAccountMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowAccountMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-[hsl(230,15%,10%)] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl">
                          <div className="px-4 py-3 border-b border-white/[0.06]">
                            <p className="text-xs text-[hsl(230,10%,40%)] mb-1">Connected (Aleo)</p>
                            <p className="text-sm font-mono text-white break-all">{truncateAddress(address)}</p>
                          </div>
                          <div className="p-2">
                            <button
                              onClick={handleCopyAddress}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors"
                            >
                              {copied ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                              {copied ? 'Copied!' : 'Copy Address'}
                            </button>
                            {address === ADMIN_ADDRESS && (
                              <Link
                                href="/admin"
                                onClick={() => setShowAccountMenu(false)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-400 hover:bg-white/[0.06] rounded-lg transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                                Admin Panel
                              </Link>
                            )}
                            <button
                              onClick={() => {
                                disconnect();
                                setShowAccountMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-white/[0.06] rounded-lg transition-colors"
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
                <Button
                  variant="outline"
                  className="gap-2 px-4 py-2"
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  {connecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
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
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder:text-[hsl(230,10%,40%)] focus:outline-none focus:border-white/[0.12] focus:ring-1 focus:ring-white/[0.08] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(230,10%,40%)] hover:text-white/70"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[hsl(230,15%,5%)]/95 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => onTabChange('market')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 transition-colors',
              activeTab === 'market' ? 'text-blue-400' : 'text-[hsl(230,10%,40%)]'
            )}
          >
            <Store className="w-5 h-5" />
            <span className="text-xs font-medium">Markets</span>
          </button>
          <button
            onClick={() => onTabChange('portfolio')}
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 transition-colors',
              activeTab === 'portfolio' ? 'text-blue-400' : 'text-[hsl(230,10%,40%)]'
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
