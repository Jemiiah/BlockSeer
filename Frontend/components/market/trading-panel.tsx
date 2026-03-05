'use client';

import { useState, useEffect } from 'react';
import { Market, OutcomeType } from '@/types';
import { cn, calculateOrderSummary, calculateOdds } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePrediction } from '@/hooks/use-prediction';
import { useOnChainPool } from '@/hooks/use-on-chain-pool';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Loader2, BarChart3, ArrowDownToLine, AlertTriangle, RefreshCw, Lock, Eye, Timer } from 'lucide-react';
import { useRevealPrediction } from '@/hooks/use-reveal-prediction';

const PROGRAM_ID = 'manifoldpredictionv4.aleo';
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 'aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd';
const CREATE_POOL_FEE = 2_000_000; // 2 ALEO in microcredits

interface TradingPanelProps {
  market: Market;
}

export function TradingPanel({ market }: TradingPanelProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType>('yes');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState<string>('');

  const [isConverting, setIsConverting] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  const { connected, address, connecting, executeTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  // Auto-connect can get stuck — timeout after 4s
  const [connectingTimedOut, setConnectingTimedOut] = useState(false);
  useEffect(() => {
    if (connecting) {
      setConnectingTimedOut(false);
      const timer = setTimeout(() => setConnectingTimedOut(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [connecting]);
  const showConnecting = connecting && !connectingTimedOut && !connected;
  const { makePrediction, isLoading, error } = usePrediction();
  const { pool: onChainPool, totalPredictions, isLoading: poolLoading } = useOnChainPool(market.id);
  const {
    getPredictionsForPool,
    revealPrediction,
    isRevealing,
    revealingId,
    txMessage: revealTxMessage,
  } = useRevealPrediction();

  // Reveal window countdown
  const [revealCountdown, setRevealCountdown] = useState<string>('');
  useEffect(() => {
    if (!market.isInRevealWindow || !market.revealWindowEnd) return;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = market.revealWindowEnd! - now;
      if (remaining <= 0) {
        setRevealCountdown('Ended');
        return;
      }
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setRevealCountdown(`${mins}m ${secs.toString().padStart(2, '0')}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [market.isInRevealWindow, market.revealWindowEnd]);

  const poolPredictions = getPredictionsForPool(market.id);

  const handleConnectWallet = () => {
    setWalletModalVisible(true);
  };

  // Convert public credits to a private record so the user can trade.
  // We convert the stake amount + extra buffer for the prediction fee,
  // and pay the conversion fee from the public balance too.
  const handleConvertToPrivate = async () => {
    if (!connected || !address || !executeTransaction) return;

    // Convert enough for the stake + prediction fee (1.5 ALEO) + buffer
    const stakeAmount = amount ? parseFloat(amount) : 5;
    const convertAmount = stakeAmount + 2; // extra for prediction fee buffer
    const microcredits = Math.floor(convertAmount * 1_000_000);

    setIsConverting(true);
    setTxStatus('pending');
    setTxMessage(`Converting ${convertAmount} ALEO from public to private...`);

    try {
      const result = await executeTransaction({
        program: 'credits.aleo',
        function: 'transfer_public_to_private',
        inputs: [address, `${microcredits}u64`],
        fee: 1_000_000, // 1 ALEO fee for conversion
        privateFee: false,
      });

      const txId = typeof result === 'string' ? result : result?.transactionId;
      if (txId) {
        setTxStatus('success');
        setTxMessage(
          `Conversion submitted (TX: ${txId.slice(0, 16)}...). ` +
          `Wait ~30s for confirmation, then try your prediction again.`
        );
      } else {
        setTxStatus('error');
        setTxMessage('Conversion failed — wallet did not return a transaction ID.');
      }
    } catch (e) {
      setTxStatus('error');
      setTxMessage(e instanceof Error ? e.message : 'Failed to convert credits');
    } finally {
      setIsConverting(false);
    }
  };

  const showConvertButton = txStatus === 'error' && txMessage.includes('private credits balance');

  const isAdmin = address === ADMIN_ADDRESS;
  const poolExpired = onChainPool && onChainPool.deadline > 0 && onChainPool.deadline < Math.floor(Date.now() / 1000);

  // Renew an expired pool by calling create_pool with the same title but a future deadline.
  // Using the same title produces the same BHP256 hash → same pool ID → overwrites the old entry.
  const handleRenewPool = async () => {
    if (!connected || !address || !executeTransaction || !onChainPool) return;

    setIsRenewing(true);
    setTxStatus('pending');
    setTxMessage('Renewing pool with new deadline...');

    try {
      // Set deadline to 1 year from now
      const newDeadline = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: 'create_pool',
        inputs: [
          `${onChainPool.title}field`,
          `${onChainPool.description}field`,
          `[${onChainPool.options[0]}field, ${onChainPool.options[1]}field]`,
          `${newDeadline}u64`,
        ],
        fee: CREATE_POOL_FEE,
        privateFee: false,
      });

      const txId = typeof result === 'string' ? result : result?.transactionId;
      if (txId) {
        setTxStatus('success');
        setTxMessage(
          `Pool renewed! TX: ${txId.slice(0, 16)}... ` +
          `Wait ~30s for on-chain confirmation, then try your prediction.`
        );
      } else {
        setTxStatus('error');
        setTxMessage('Failed to renew pool — wallet did not return a transaction ID.');
      }
    } catch (e) {
      setTxStatus('error');
      setTxMessage(e instanceof Error ? e.message : 'Failed to renew pool');
    } finally {
      setIsRenewing(false);
    }
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
    setTxMessage('Fetching records & preparing transaction...');

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
        poolId: market.id,
        option: option as 1 | 2,
        amount: amountInAleo,
        onProgress: (msg) => setTxMessage(msg),
      });

      if (result.status === 'success') {
        setTxStatus('success');
        setTxMessage(`Prediction confirmed on-chain! TX: ${result.transactionId?.slice(0, 16)}...`);
        setAmount('');
      } else if (result.status === 'pending') {
        setTxStatus('success');
        setTxMessage(`Transaction submitted (TX: ${result.transactionId?.slice(0, 16)}...). Check explorer for confirmation.`);
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
    <div className="relative bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 sticky top-[88px] overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <h2 className="text-lg font-semibold text-white mb-6">Place Order</h2>

      {/* Pool Stats */}
      {onChainPool && (
        <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[hsl(230,10%,50%)] mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Pool Stats {market.oddsRevealed ? '(On-Chain)' : market.isInRevealWindow ? '(Reveal Window)' : '(Sealed)'}
          </div>
          {market.oddsRevealed ? (
            <>
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
            </>
          ) : market.isInRevealWindow ? (
            <div className="flex items-center gap-2 text-sm text-violet-400/80 py-2">
              <Timer className="w-3.5 h-3.5" />
              <span>Reveals in progress — {revealCountdown} remaining</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-400/80 py-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Stakes hidden until deadline</span>
            </div>
          )}
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
          hidden={!market.oddsRevealed}
        />
        <OutcomeButton
          type="no"
          price={market.noPrice}
          isSelected={selectedOutcome === 'no'}
          onClick={() => setSelectedOutcome('no')}
          hidden={!market.oddsRevealed}
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
        {market.oddsRevealed ? (
          <>
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
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[hsl(230,10%,50%)] py-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Returns calculated after deadline</span>
          </div>
        )}
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
          {showConvertButton && (
            <button
              onClick={handleConvertToPrivate}
              disabled={isConverting}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium border border-blue-500/20 transition-colors disabled:opacity-50"
            >
              {isConverting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              Convert {amount || '5'} ALEO to Private
            </button>
          )}
        </div>
      )}

      {/* Reveal Window Banner */}
      {market.isInRevealWindow && (
        <div className="mb-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-violet-400">Reveal Window Open</span>
            <span className="ml-auto text-xs font-mono text-violet-400/80">{revealCountdown}</span>
          </div>
          <p className="text-xs text-violet-400/60 mb-3">
            Reveal your predictions to claim winnings after resolution. Unrevealed predictions forfeit rewards.
          </p>
          {poolPredictions.length > 0 ? (
            <div className="space-y-2">
              {poolPredictions.map((pred) => (
                <button
                  key={pred.id}
                  onClick={() => revealPrediction(pred)}
                  disabled={isRevealing}
                  className="w-full flex items-center justify-between gap-2 py-2.5 px-4 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-sm font-medium border border-violet-500/20 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    {isRevealing && revealingId === pred.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Reveal: {pred.option === 1 ? 'Yes' : 'No'} — {(pred.amount / 1_000_000).toFixed(2)} ALEO
                  </span>
                </button>
              ))}
              {revealTxMessage && (
                <p className="text-xs text-violet-400/70 mt-1">{revealTxMessage}</p>
              )}
            </div>
          ) : connected ? (
            <p className="text-xs text-violet-400/50">No predictions found for this pool in your wallet.</p>
          ) : (
            <p className="text-xs text-violet-400/50">Connect wallet to reveal predictions.</p>
          )}
        </div>
      )}

      {/* Pool Expired Warning */}
      {poolExpired && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm">
          <p className="font-medium mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pool Expired
          </p>
          <p className="text-amber-400/70 text-xs mb-2">
            This pool&apos;s deadline has passed. Predictions cannot be placed on expired pools.
          </p>
          {isAdmin && (
            <button
              onClick={handleRenewPool}
              disabled={isRenewing}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium border border-amber-500/20 transition-colors disabled:opacity-50"
            >
              {isRenewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Renew Pool (Admin)
            </button>
          )}
        </div>
      )}

      {/* Submit Button */}
      {connected ? (
        <Button
          onClick={handleTrade}
          disabled={isLoading || !amount || parseFloat(amount) <= 0 || !!poolExpired}
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
          className={cn(
            "w-full py-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20",
            showConnecting && "opacity-50"
          )}
        >
          {showConnecting ? (
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
  hidden?: boolean;
}

function OutcomeButton({ type, price, isSelected, onClick, hidden }: OutcomeButtonProps) {
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
      <div className="text-xl">{hidden ? '--' : `${price}¢`}</div>
    </button>
  );
}
