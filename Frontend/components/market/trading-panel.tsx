'use client';

import { useState } from 'react';
import { Market, OutcomeType } from '@/types';
import { cn, calculateOrderSummary, calculateOdds } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePrediction } from '@/hooks/use-prediction';
import { useOnChainPool } from '@/hooks/use-on-chain-pool';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Loader2, BarChart3 } from 'lucide-react';

interface TradingPanelProps {
  market: Market;
}

export function TradingPanel({ market }: TradingPanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType>('yes');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState<string>('');

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

  const handleTrade = async () => {
    if (!connected || !amount) return;

    setTxStatus('pending');
    setTxMessage('Submitting prediction...');

    // Convert outcome to option number (1 for yes/option A, 2 for no/option B)
    const option = selectedOutcome === 'yes' ? 1 : 2;

    // Amount in Aleo (the hook will convert to microcredits)
    const amountInAleo = parseFloat(amount);

    if (isNaN(amountInAleo) || amountInAleo <= 0) {
      setTxStatus('error');
      setTxMessage('Please enter a valid amount');
      return;
    }

    try {
      const result = await makePrediction({
        poolId: '1', // Default pool ID for now
        option: option as 1 | 2,
        amount: amountInAleo,
      });

      if (result.status === 'success') {
        setTxStatus('success');
        setTxMessage(`Prediction submitted! TX: ${result.transactionId?.slice(0, 10)}...`);
        setAmount(''); // Reset amount after successful transaction
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
    <div className="relative bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 sticky top-[88px] overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <h2 className="text-lg font-semibold text-white mb-6">Place Order</h2>

      {/* Pool Stats */}
      {onChainPool && (
        <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[hsl(230,10%,50%)] mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Pool Stats (On-Chain)
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(230,10%,40%)]">Total Staked</span>
            <span className="text-white/80 font-medium">{(onChainPool.total_staked / 1_000_000).toFixed(2)} ALEO</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(230,10%,40%)]">Yes Pool</span>
            <span className="text-blue-400 font-medium">{(onChainPool.option_a_stakes / 1_000_000).toFixed(2)} ALEO</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(230,10%,40%)]">No Pool</span>
            <span className="text-white/60 font-medium">{(onChainPool.option_b_stakes / 1_000_000).toFixed(2)} ALEO</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(230,10%,40%)]">Predictions</span>
            <span className="text-white/80 font-medium">{totalPredictions}</span>
          </div>
        </div>
      )}

      {/* Outcome Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <OutcomeButton
          type="yes"
          price={market.yesPrice}
          isSelected={selectedOutcome === 'yes'}
          onClick={() => setSelectedOutcome('yes')}
        />
        <OutcomeButton
          type="no"
          price={market.noPrice}
          isSelected={selectedOutcome === 'no'}
          onClick={() => setSelectedOutcome('no')}
        />
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="text-xs text-[hsl(230,10%,40%)] mb-2 block">Amount (ALEO)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(230,10%,40%)]">◎</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-4 pl-8 pr-4 text-white placeholder-[hsl(230,10%,30%)] focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2 mt-3">
          {quickAmounts.map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="flex-1 py-2 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-[hsl(230,10%,50%)] hover:text-white rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-all"
            >
              {val} ALEO
            </button>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[hsl(230,10%,40%)]">Odds</span>
          <span className="text-white/80 font-medium">{orderSummary.odds}x</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[hsl(230,10%,40%)]">Implied Probability</span>
          <span className="text-white/80 font-medium">{orderSummary.avgPrice}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[hsl(230,10%,40%)]">Shares</span>
          <span className="text-white/80 font-medium">{orderSummary.shares}</span>
        </div>
        <div className="border-t border-white/[0.06] pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-[hsl(230,10%,50%)]">Potential Return</span>
            <span className="text-emerald-400 font-semibold">{orderSummary.potentialReturn} ALEO</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(230,10%,40%)]">Profit</span>
            <span className="text-emerald-400/80 font-medium">+{orderSummary.profit} ALEO</span>
          </div>
        </div>
      </div>

      {/* Transaction Status */}
      {txStatus !== 'idle' && (
        <div
          className={cn(
            'mb-4 p-3 rounded-lg text-sm',
            txStatus === 'pending' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
            txStatus === 'success' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            txStatus === 'error' && 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}
        >
          {txStatus === 'pending' && (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {txMessage}
            </span>
          )}
          {txStatus !== 'pending' && txMessage}
        </div>
      )}

      {/* Submit Button */}
      {connected ? (
        <Button
          onClick={handleTrade}
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
          className="w-full py-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </span>
          ) : (
            `Predict ${selectedOutcome === 'yes' ? 'Yes' : 'No'}`
          )}
        </Button>
      ) : (
        <Button
          onClick={handleConnectWallet}
          disabled={connecting}
          className="w-full py-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {connecting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting...
            </span>
          ) : (
            'Connect Wallet to Trade'
          )}
        </Button>
      )}

      <p className="text-xs text-[hsl(230,10%,35%)] text-center mt-4">Powered by Aleo Zero-Knowledge Proofs</p>
    </div>
  );
}

interface OutcomeButtonProps {
  type: OutcomeType;
  price: number;
  isSelected: boolean;
  onClick: () => void;
}

function OutcomeButton({ type, price, isSelected, onClick }: OutcomeButtonProps) {
  const isYes = type === 'yes';

  return (
    <button
      onClick={onClick}
      className={cn(
        'py-4 rounded-xl font-semibold transition-all duration-200 border',
        isSelected
          ? isYes
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 border-blue-500/50'
            : 'bg-white/[0.12] text-white shadow-lg shadow-white/5 border-white/[0.15]'
          : 'bg-white/[0.04] text-[hsl(230,10%,50%)] hover:bg-white/[0.08] border-white/[0.06]'
      )}
    >
      <div className="text-xs opacity-70 mb-1">Buy {isYes ? 'Yes' : 'No'}</div>
      <div className="text-xl">{price}¢</div>
    </button>
  );
}
