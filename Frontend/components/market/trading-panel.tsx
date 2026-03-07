'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Market, OutcomeType } from '@/types';
import { cn, calculateOrderSummary, calculateOdds } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePrediction } from '@/hooks/use-prediction';
import { useOnChainPool } from '@/hooks/use-on-chain-pool';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Loader2, BarChart3, ArrowDownToLine, AlertTriangle, RefreshCw, Lock, Eye, Timer, Trophy, ShieldAlert, Undo2 } from 'lucide-react';
import { useRevealPrediction } from '@/hooks/use-reveal-prediction';
import { useCollectWinnings } from '@/hooks/use-collect-winnings';
import { useDispute } from '@/hooks/use-dispute';
import { useRefund } from '@/hooks/use-refund';
import { formatTokenAmount } from '@/lib/tokens';

const PROGRAM_ID = 'manifoldpredictionv6.aleo';
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

  const queryClient = useQueryClient();
  const { connected, address, connecting, executeTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

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
  const { collectWinnings, isLoading: isCollecting, error: collectError } = useCollectWinnings();
  const { disputePool, isLoading: isDisputing, error: disputeError } = useDispute();
  const { refundPrediction, isLoading: isRefunding, error: refundError } = useRefund();

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

  // Dispute window countdown
  const [disputeCountdown, setDisputeCountdown] = useState<string>('');
  useEffect(() => {
    if (!market.isInDisputeWindow || !market.disputeWindowEnd) return;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = market.disputeWindowEnd! - now;
      if (remaining <= 0) {
        setDisputeCountdown('Ended');
        return;
      }
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      setDisputeCountdown(`${hours}h ${mins}m`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [market.isInDisputeWindow, market.disputeWindowEnd]);

  const poolPredictions = getPredictionsForPool(market.id);

  const handleConnectWallet = () => {
    setWalletModalVisible(true);
  };

  const handleConvertToPrivate = async () => {
    if (!connected || !address || !executeTransaction) return;

    const stakeAmount = amount ? parseFloat(amount) : 5;
    const convertAmount = stakeAmount + 2;
    const microcredits = Math.floor(convertAmount * 1_000_000);

    setIsConverting(true);
    setTxStatus('pending');
    setTxMessage(`Converting ${convertAmount} ALEO from public to private...`);

    try {
      const result = await executeTransaction({
        program: 'credits.aleo',
        function: 'transfer_public_to_private',
        inputs: [address, `${microcredits}u64`],
        fee: 1_000_000,
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

  const handleRenewPool = async () => {
    if (!connected || !address || !executeTransaction || !onChainPool) return;

    setIsRenewing(true);
    setTxStatus('pending');
    setTxMessage('Renewing pool with new deadline...');

    try {
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

    const option = selectedOutcome === 'yes' ? 1 : 2;
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
        // Invalidate caches so markets/pool/portfolio refresh immediately
        queryClient.invalidateQueries({ queryKey: ['markets'] });
        queryClient.invalidateQueries({ queryKey: ['onChainPool', market.id] });
      } else if (result.status === 'pending') {
        setTxStatus('success');
        setTxMessage(`Transaction submitted (TX: ${result.transactionId?.slice(0, 16)}...). Check explorer for confirmation.`);
        setAmount('');
        queryClient.invalidateQueries({ queryKey: ['markets'] });
        queryClient.invalidateQueries({ queryKey: ['onChainPool', market.id] });
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
    <div className="relative bg-[#161820] border border-[#23262f] rounded-xl p-6 sticky top-[88px]">
      <h2 className="text-lg font-semibold text-white mb-6">Place Order</h2>

      {/* Token denomination badge */}
      {market.tokenSymbol && market.tokenSymbol !== 'ALEO' && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-violet-500/30 bg-violet-500/10 text-violet-400">
            {market.tokenSymbol}
          </span>
          <span className="text-xs text-[#5a5c66]">Pool denomination</span>
        </div>
      )}

      {onChainPool && (
        <div className="bg-[#1c1f2a] border border-[#23262f] rounded-xl p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#8b8d97] mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Pool Stats {market.oddsRevealed ? '(On-Chain)' : market.isInRevealWindow ? '(Reveal Window)' : '(Sealed)'}
          </div>
          {market.oddsRevealed ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-[#5a5c66]">Total Staked</span>
                <span className="text-[#e8e9ed] font-medium">{formatTokenAmount(onChainPool.total_staked, market.tokenId).toFixed(2)} {market.tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5a5c66]">Yes Pool</span>
                <span className="text-[#00c278] font-medium">{formatTokenAmount(onChainPool.option_a_stakes, market.tokenId).toFixed(2)} {market.tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5a5c66]">No Pool</span>
                <span className="text-[#ff4d4d] font-medium">{formatTokenAmount(onChainPool.option_b_stakes, market.tokenId).toFixed(2)} {market.tokenSymbol}</span>
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
            <span className="text-[#5a5c66]">Predictions</span>
            <span className="text-[#e8e9ed] font-medium">{totalPredictions}</span>
          </div>
        </div>
      )}

      {/* Outcome Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setSelectedOutcome('yes')}
          className={cn(
            'relative py-8 px-4 rounded-xl font-semibold transition-all duration-200 border-2',
            selectedOutcome === 'yes'
              ? 'bg-[#00c278]/15 border-[#00c278] shadow-lg shadow-[#00c278]/10'
              : 'bg-[#1c1f2a] border-[#23262f] hover:bg-[#23262f] hover:border-[#2f3340]'
          )}
        >
          <div className="text-sm font-medium mb-2 text-[#8b8d97]">Buy</div>
          <div className="text-2xl font-bold text-white mb-2">Yes</div>
          <div className={cn(
            "text-xl font-mono font-semibold",
            selectedOutcome === 'yes' ? 'text-[#00c278]' : 'text-[#8b8d97]'
          )}>
            {market.oddsRevealed ? `${market.yesPrice}¢` : '--'}
          </div>
          {selectedOutcome === 'yes' && (
            <div className="absolute top-3 right-3">
              <div className="w-5 h-5 rounded-full bg-[#00c278] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </button>
        <button
          onClick={() => setSelectedOutcome('no')}
          className={cn(
            'relative py-8 px-4 rounded-xl font-semibold transition-all duration-200 border-2',
            selectedOutcome === 'no'
              ? 'bg-[#ff4d4d]/15 border-[#ff4d4d] shadow-lg shadow-[#ff4d4d]/10'
              : 'bg-[#1c1f2a] border-[#23262f] hover:bg-[#23262f] hover:border-[#2f3340]'
          )}
        >
          <div className="text-sm font-medium mb-2 text-[#8b8d97]">Buy</div>
          <div className="text-2xl font-bold text-white mb-2">No</div>
          <div className={cn(
            "text-xl font-mono font-semibold",
            selectedOutcome === 'no' ? 'text-[#ff4d4d]' : 'text-[#8b8d97]'
          )}>
            {market.oddsRevealed ? `${market.noPrice}¢` : '--'}
          </div>
          {selectedOutcome === 'no' && (
            <div className="absolute top-3 right-3">
              <div className="w-5 h-5 rounded-full bg-[#ff4d4d] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="text-xs text-[#5a5c66] mb-2 block">Amount ({market.tokenSymbol})</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a5c66]">◎</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full bg-[#1c1f2a] border border-[#23262f] rounded-xl py-4 pl-8 pr-4 text-white placeholder-[#5a5c66] focus:outline-none focus:border-[#4b8cff]/40 focus:ring-1 focus:ring-[#4b8cff]/20 transition-all"
          />
        </div>
        <div className="flex gap-2 mt-3">
          {quickAmounts.map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="flex-1 py-2 text-xs font-medium bg-[#1c1f2a] hover:bg-[#23262f] text-[#8b8d97] hover:text-white rounded-lg border border-[#23262f] hover:border-[#2f3340] transition-all"
            >
              {val} {market.tokenSymbol}
            </button>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-[#1c1f2a] border border-[#23262f] rounded-xl p-4 mb-6 space-y-3">
        {market.oddsRevealed ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a5c66]">Odds</span>
              <span className="text-[#e8e9ed] font-medium">{orderSummary.odds}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a5c66]">Implied Probability</span>
              <span className="text-[#e8e9ed] font-medium">{orderSummary.avgPrice}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5a5c66]">Shares</span>
              <span className="text-[#e8e9ed] font-medium">{orderSummary.shares}</span>
            </div>
            <div className="border-t border-[#23262f] pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8b8d97]">Potential Return</span>
                <span className="text-[#00c278] font-semibold">{orderSummary.potentialReturn} {market.tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5a5c66]">Profit</span>
                <span className="text-[#00c278]/80 font-medium">+{orderSummary.profit} {market.tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5a5c66]">Protocol Fee</span>
                <span className="text-[#5a5c66] font-medium">2%</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[#8b8d97] py-2">
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
            txStatus === 'pending' && 'bg-[#4b8cff]/10 text-[#4b8cff] border border-[#4b8cff]/20',
            txStatus === 'success' && 'bg-[#00c278]/10 text-[#00c278] border border-[#00c278]/20',
            txStatus === 'error' && 'bg-[#ff4d4d]/10 text-[#ff4d4d] border border-[#ff4d4d]/20'
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
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#4b8cff]/20 hover:bg-[#4b8cff]/30 text-[#4b8cff] text-sm font-medium border border-[#4b8cff]/20 transition-colors disabled:opacity-50"
            >
              {isConverting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              Convert {amount || '5'} {market.tokenSymbol} to Private
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
                    Reveal: {pred.option === 1 ? 'Yes' : 'No'} — {formatTokenAmount(pred.amount, market.tokenId).toFixed(2)} {market.tokenSymbol}
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

      {/* Privacy Notice */}
      {!market.oddsRevealed && (
        <div className="mb-4 p-4 rounded-xl bg-[#4b8cff]/10 border border-[#4b8cff]/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Lock className="w-4 h-4 text-[#4b8cff]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#4b8cff] mb-1.5">
                Private Prediction
              </p>
              <p className="text-xs text-[#4b8cff]/70 leading-relaxed">
                Your choice and amount are encrypted in your wallet record — never revealed on-chain.
                Only a commitment hash is posted. Pool totals stay hidden until the reveal window,
                preventing front-running and keeping the market fair.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Claim Winnings Section */}
      {market.isClaimable && connected && poolPredictions.length > 0 && onChainPool && (
        <div className="mb-4 p-4 rounded-xl bg-[#00c278]/10 border border-[#00c278]/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-[#00c278]" />
            <span className="text-sm font-semibold text-[#00c278]">Claim Winnings</span>
          </div>
          <p className="text-xs text-[#00c278]/60 mb-3">
            This market is resolved and the dispute window has passed. Claim your winnings below (2% protocol fee).
          </p>
          <div className="space-y-2">
            {poolPredictions.map((pred) => (
              <button
                key={pred.id}
                onClick={() => collectWinnings({
                  winningOption: onChainPool.winning_option,
                  totalStaked: onChainPool.total_staked,
                  optionAStakes: onChainPool.option_a_stakes,
                  optionBStakes: onChainPool.option_b_stakes,
                  predictionRecord: pred.recordInput,
                  onProgress: (msg) => setTxMessage(msg),
                })}
                disabled={isCollecting}
                className="w-full flex items-center justify-between gap-2 py-2.5 px-4 rounded-lg bg-[#00c278]/20 hover:bg-[#00c278]/30 text-[#00c278] text-sm font-medium border border-[#00c278]/20 transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {isCollecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trophy className="h-4 w-4" />
                  )}
                  Claim: {pred.option === 1 ? 'Yes' : 'No'} — {formatTokenAmount(pred.amount, market.tokenId).toFixed(2)} {market.tokenSymbol}
                </span>
              </button>
            ))}
            {collectError && (
              <p className="text-xs text-[#ff4d4d]/70 mt-1">{collectError}</p>
            )}
          </div>
        </div>
      )}

      {/* Dispute Section */}
      {market.isInDisputeWindow && connected && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Dispute Window</span>
            <span className="ml-auto text-xs font-mono text-amber-400/80">{disputeCountdown}</span>
          </div>
          <p className="text-xs text-amber-400/60 mb-3">
            If you believe this market was resolved incorrectly, you can dispute it during this window.
          </p>
          <button
            onClick={() => disputePool(market.id, (msg) => setTxMessage(msg))}
            disabled={isDisputing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium border border-amber-500/20 transition-colors disabled:opacity-50"
          >
            {isDisputing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            Dispute Resolution
          </button>
          {disputeError && (
            <p className="text-xs text-[#ff4d4d]/70 mt-2">{disputeError}</p>
          )}
        </div>
      )}

      {/* Cancelled / Refund Section */}
      {market.isCancelled && connected && poolPredictions.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[#ff4d4d]/10 border border-[#ff4d4d]/20">
          <div className="flex items-center gap-2 mb-2">
            <Undo2 className="w-4 h-4 text-[#ff4d4d]" />
            <span className="text-sm font-semibold text-[#ff4d4d]">Market Cancelled</span>
          </div>
          <p className="text-xs text-[#ff4d4d]/60 mb-3">
            This market was cancelled after a dispute. Refund your predictions below.
          </p>
          <div className="space-y-2">
            {poolPredictions.map((pred) => (
              <button
                key={pred.id}
                onClick={() => refundPrediction(pred.recordInput, (msg) => setTxMessage(msg))}
                disabled={isRefunding}
                className="w-full flex items-center justify-between gap-2 py-2.5 px-4 rounded-lg bg-[#ff4d4d]/20 hover:bg-[#ff4d4d]/30 text-[#ff4d4d] text-sm font-medium border border-[#ff4d4d]/20 transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {isRefunding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Undo2 className="h-4 w-4" />
                  )}
                  Refund: {pred.option === 1 ? 'Yes' : 'No'} — {formatTokenAmount(pred.amount, market.tokenId).toFixed(2)} {market.tokenSymbol}
                </span>
              </button>
            ))}
            {refundError && (
              <p className="text-xs text-[#ff4d4d]/70 mt-1">{refundError}</p>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {connected ? (
        <Button
          onClick={handleTrade}
          disabled={isLoading || !amount || parseFloat(amount) <= 0 || !!poolExpired}
          className={cn(
            "w-full py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
            selectedOutcome === 'yes'
              ? 'bg-[#00c278] hover:bg-[#00a866] text-white'
              : 'bg-[#ff4d4d] hover:bg-[#e64444] text-white'
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </span>
          ) : (
            `Buy ${selectedOutcome === 'yes' ? 'Yes' : 'No'}${amount ? ` for ${amount} ${market.tokenSymbol}` : ''}`
          )}
        </Button>
      ) : (
        <Button
          onClick={handleConnectWallet}
          className={cn(
            "w-full py-6 text-lg font-semibold bg-[#4b8cff] hover:bg-[#3a7bf0] text-white",
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

      <p className="text-xs text-[#5a5c66] text-center mt-4">Powered by Aleo Zero-Knowledge Proofs</p>
    </div>
  );
}
