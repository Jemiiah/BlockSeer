'use client';

import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import {
  ArrowLeft,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 'aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd';

const METRIC_TYPES = [
  { value: 'eth_price', label: 'ETH Price', description: 'Ethereum price in USD' },
  { value: 'btc_price', label: 'BTC Price', description: 'Bitcoin price in USD' },
  { value: 'eth_gas_price', label: 'ETH Gas Price', description: 'Ethereum gas price in gwei' },
  { value: 'btc_dominance', label: 'BTC Dominance', description: 'BTC #1 market cap (1=yes, 0=no)' },
  { value: 'eth_staking_rate', label: 'ETH Staking Rate', description: 'Ethereum staking APR %' },
  { value: 'fear_greed', label: 'Fear & Greed Index', description: 'Crypto market sentiment (0-100)' },
  { value: 'stablecoin_peg', label: 'Stablecoin Peg', description: 'USDT/USDC peg status' },
  { value: 'generic', label: 'Generic (Manual)', description: 'Admin resolves manually' },
];

const CATEGORIES = [
  { value: 'Crypto', label: 'Crypto' },
  { value: 'Tech', label: 'Tech' },
  { value: 'AI', label: 'AI' },
  { value: 'DeFi', label: 'DeFi' },
];

const TOKENS = [
  { value: '0field', label: 'ALEO' },
  { value: 'usdcx_token_id', label: 'USDCx' },
  { value: 'usad_token_id', label: 'USAD' },
];

interface MarketForm {
  title: string;
  description: string;
  option_a_label: string;
  option_b_label: string;
  metric_type: string;
  threshold: string;
  deadline: string;
  category: string;
  token_id: string;
}

const initialForm: MarketForm = {
  title: '',
  description: '',
  option_a_label: 'YES',
  option_b_label: 'NO',
  metric_type: 'eth_price',
  threshold: '',
  deadline: '',
  category: 'Crypto',
  token_id: '0field',
};

export default function AdminPage() {
  const { address, connected, connecting } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [form, setForm] = useState<MarketForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; marketId?: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = connected && address === ADMIN_ADDRESS;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const deadlineTimestamp = Math.floor(new Date(form.deadline).getTime() / 1000);

      const payload = {
        title: form.title,
        description: form.description,
        option_a_label: form.option_a_label,
        option_b_label: form.option_b_label,
        metric_type: form.metric_type,
        threshold: form.threshold,
        deadline: deadlineTimestamp.toString(),
        category: form.category,
        token_id: form.token_id,
      };

      const response = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create market: ${response.statusText}`);
      }

      const data = await response.json();
      setResult({
        success: true,
        message: 'Market created successfully!',
        marketId: data.market_id,
      });
      setForm(initialForm);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create market'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (connecting) {
    return (
      <div className="min-h-screen bg-[hsl(230,15%,7%)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-white mb-2">Connecting Wallet...</h1>
          <p className="text-[hsl(230,10%,50%)]">Please wait while your wallet connects.</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-[hsl(230,15%,7%)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h1>
          <p className="text-[hsl(230,10%,50%)] mb-6">Connect your wallet to access the admin panel.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setWalletModalVisible(true)} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
            <Link href="/">
              <Button variant="outline">Go Back</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[hsl(230,15%,7%)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-[hsl(230,10%,50%)] mb-2">Only the admin wallet can create markets.</p>
          <p className="text-[hsl(230,10%,35%)] text-sm font-mono break-all mb-6">
            {ADMIN_ADDRESS}
          </p>
          <Link href="/">
            <Button variant="outline">Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedToken = TOKENS.find(t => t.value === form.token_id)?.label ?? 'ALEO';

  return (
    <div className="min-h-screen bg-[hsl(230,15%,7%)]">
      {/* Sticky Header */}
      <div className="border-b border-white/[0.06] sticky top-0 z-10 bg-[hsl(230,15%,7%)]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-[hsl(230,10%,50%)] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Markets
          </Link>
          <span className="text-xs font-mono text-[hsl(230,10%,35%)]">
            {address?.slice(0, 10)}...{address?.slice(-6)}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Create New Market</h1>
          <p className="text-[hsl(230,10%,50%)] text-lg">
            Create a prediction market that will be resolved by the oracle.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form — Left Column */}
          <div className="lg:col-span-3">
            {/* Result Banner */}
            {result && (
              <div className={cn(
                'mb-8 p-4 rounded-xl flex items-start gap-3 border',
                result.success
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              )}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className={result.success ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                    {result.message}
                  </span>
                  {result.marketId && (
                    <button
                      onClick={() => handleCopyId(result.marketId!)}
                      className="mt-2 w-full flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2 text-xs font-mono text-white/80 hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="truncate">ID: {result.marketId}</span>
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-auto" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[hsl(230,10%,50%)] flex-shrink-0 ml-auto" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Core Details */}
              <fieldset className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-5">
                <legend className="text-xs font-semibold uppercase tracking-wider text-[hsl(230,10%,50%)] px-1">
                  Core Details
                </legend>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Market Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="ETH above $4,000?"
                    required
                    maxLength={200}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-[hsl(230,10%,30%)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="text-[10px] text-[hsl(230,10%,35%)] mt-1.5">{form.title.length}/200</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide detailed resolution criteria..."
                    required
                    rows={3}
                    maxLength={500}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-[hsl(230,10%,30%)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                  />
                  <p className="text-[10px] text-[hsl(230,10%,35%)] mt-1.5">{form.description.length}/500</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Option A *</label>
                    <input
                      type="text"
                      name="option_a_label"
                      value={form.option_a_label}
                      onChange={handleChange}
                      placeholder="YES"
                      required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-[hsl(230,10%,30%)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Option B *</label>
                    <input
                      type="text"
                      name="option_b_label"
                      value={form.option_b_label}
                      onChange={handleChange}
                      placeholder="NO"
                      required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-[hsl(230,10%,30%)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Section 2: Market Settings */}
              <fieldset className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-5">
                <legend className="text-xs font-semibold uppercase tracking-wider text-[hsl(230,10%,50%)] px-1">
                  Market Settings
                </legend>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Category *</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Token *</label>
                    <select
                      name="token_id"
                      value={form.token_id}
                      onChange={handleChange}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    >
                      {TOKENS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Oracle Metric *</label>
                  <select
                    name="metric_type"
                    value={form.metric_type}
                    onChange={handleChange}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  >
                    {METRIC_TYPES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[hsl(230,10%,35%)] mt-1.5">
                    {METRIC_TYPES.find(m => m.value === form.metric_type)?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Threshold *</label>
                  <input
                    type="number"
                    name="threshold"
                    value={form.threshold}
                    onChange={handleChange}
                    placeholder="4000"
                    required
                    step="0.01"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-[hsl(230,10%,30%)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="text-[10px] text-[hsl(230,10%,35%)] mt-1.5">
                    If metric ≥ {form.threshold || '?'} → {form.option_a_label} wins, otherwise → {form.option_b_label} wins
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Resolution Deadline *</label>
                  <input
                    type="datetime-local"
                    name="deadline"
                    value={form.deadline}
                    onChange={handleChange}
                    required
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <p className="text-[10px] text-[hsl(230,10%,35%)] mt-1.5">
                    Market locks at this time. Betting closes.
                  </p>
                </div>
              </fieldset>

              {/* Section 3: Advanced (collapsible) */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(230,10%,50%)]">
                    Advanced / Protocol Defaults
                  </span>
                  <ChevronDown className={cn('w-4 h-4 text-[hsl(230,10%,50%)] transition-transform duration-200', showAdvanced && 'rotate-180')} />
                </button>

                {showAdvanced && (
                  <div className="border-t border-white/[0.06] px-6 py-5 space-y-3">
                    {[
                      ['Reveal Window', '1 hour', 'Users reveal predictions after market locks'],
                      ['Dispute Window', '24 hours', 'Users can dispute incorrect resolution'],
                      ['Protocol Fee', '2%', 'Deducted from winnings on claim'],
                      ['Pool Currency', selectedToken, 'Token denomination for this market'],
                    ].map(([label, value, desc]) => (
                      <div key={label} className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <div>
                          <p className="text-sm text-white/80">{label}</p>
                          <p className="text-[10px] text-[hsl(230,10%,35%)]">{desc}</p>
                        </div>
                        <span className="text-sm font-mono text-white/60">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Market...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Market
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Live Preview — Right Column */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(230,10%,50%)]">
                  Live Preview
                </h3>

                {form.title ? (
                  <>
                    {/* Category + Token badges */}
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-semibold border border-blue-500/20 uppercase tracking-wide">
                        {form.category}
                      </span>
                      {form.token_id !== '0field' && (
                        <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-[10px] font-semibold border border-violet-500/20">
                          {selectedToken}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-xl font-bold text-white leading-tight">{form.title}</h4>

                    {/* Subtitle */}
                    {form.description && (
                      <p className="text-sm text-[hsl(230,10%,45%)] line-clamp-2">{form.description}</p>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl py-4 text-center">
                        <p className="text-xs text-blue-400/60 mb-1">Option A</p>
                        <p className="text-lg font-bold text-blue-400">{form.option_a_label}</p>
                      </div>
                      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl py-4 text-center">
                        <p className="text-xs text-white/40 mb-1">Option B</p>
                        <p className="text-lg font-bold text-white/70">{form.option_b_label}</p>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(230,10%,40%)]">Oracle</span>
                        <span className="text-white/70">
                          {METRIC_TYPES.find(m => m.value === form.metric_type)?.label}
                        </span>
                      </div>
                      {form.threshold && (
                        <div className="flex justify-between text-xs">
                          <span className="text-[hsl(230,10%,40%)]">Threshold</span>
                          <span className="text-white/70 font-mono">{form.threshold}</span>
                        </div>
                      )}
                      {form.deadline && (
                        <div className="flex justify-between text-xs">
                          <span className="text-[hsl(230,10%,40%)]">Deadline</span>
                          <span className="text-white/70">
                            {new Date(form.deadline).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(230,10%,40%)]">Currency</span>
                        <span className="text-white/70">{selectedToken}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(230,10%,40%)]">Fee</span>
                        <span className="text-white/70">2%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-sm text-[hsl(230,10%,35%)]">
                      Fill in the form to see a live preview
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
