import "@provablehq/sdk/testnet.js";
import {
    Account,
    AleoNetworkClient,
    NetworkRecordProvider,
    ProgramManager,
    AleoKeyProvider,
    initThreadPool,
} from "@provablehq/sdk";
import * as db from "./db.js";
import type { MarketRow } from "./types.js";
import { registry } from "./metrics/registry.js";
import {
    ORACLE_PRIVATE_KEY,
    ALEO_NODE_URL,
    PROGRAM_ID,
    PROGRAM_SOURCE,
    CREATE_POOL_FEE,
    LOCK_POOL_FEE,
    RESOLVE_POOL_FEE,
    CANCEL_POOL_FEE,
    REVEAL_WINDOW_SECONDS,
    DISPUTE_WINDOW_SECONDS,
} from "./config.js";

// Setup SDK
const account = new Account({ privateKey: ORACLE_PRIVATE_KEY });
const networkClient = new AleoNetworkClient(ALEO_NODE_URL);
const keyProvider = new AleoKeyProvider();
const recordProvider = new NetworkRecordProvider(account, networkClient);
keyProvider.useCache(true);

const programManager = new ProgramManager(
    ALEO_NODE_URL,
    keyProvider,
    recordProvider
);

programManager.setAccount(account);

const stringToField = (str: string): string => {
    const buffer = Buffer.from(str, "utf8");
    let hex = buffer.toString("hex");
    if (buffer.length > 31) hex = buffer.subarray(0, 31).toString("hex");
    const bigInt = BigInt("0x" + hex);
    return `${bigInt}field`;
};

const fieldToString = (field: string): string => {
    try {
        const bigIntStr = field.replace("field", "");
        const bigInt = BigInt(bigIntStr);
        let hex = bigInt.toString(16);
        if (hex.length % 2 !== 0) hex = "0" + hex;
        const buffer = Buffer.from(hex, "hex");
        return buffer.toString("utf8");
    } catch (e) {
        return "Unknown";
    }
};

async function syncOnChainData() {
    console.log("🔄 Syncing on-chain market data...");
    const allMarkets = await db.getAllMarkets();

    for (const market of allMarkets) {
        const { market_id } = market;
        try {
            // During blind betting phase, on-chain stakes are 0 (users haven't revealed yet).
            // Use Oracle-tracked aggregates for pending markets and locked markets still in reveal window.
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const revealWindowEnd = market.reveal_window_end ? parseInt(market.reveal_window_end, 10) : null;
            const inRevealWindow = market.status === 'locked' && revealWindowEnd && currentTimestamp < revealWindowEnd;
            if (market.status === 'pending' || inRevealWindow) {
                // Use Oracle-tracked aggregates instead of on-chain data (which may be partial during reveals)
                const aggregates = await db.getMarketAggregateStakes(market_id);
                await db.updateMarketStats(market_id, aggregates.total_staked, aggregates.option_a_stakes, aggregates.option_b_stakes);
                continue;
            }

            // Use market_id directly if it's already a field, otherwise convert
            const marketIdField = market_id.endsWith('field') ? market_id : stringToField(market_id);

            // Query the 'pools' mapping in the program
            const poolData = await networkClient.getProgramMappingValue(
                PROGRAM_ID,
                "pools",
                marketIdField
            );

            if (poolData) {
                console.log(`📊 Fetched on-chain data for ${market_id}`);

                // Parse stats
                const totalStakedMatch = poolData.match(/total_staked:\s*(\d+)u64/);
                const optionAStakesMatch = poolData.match(/option_a_stakes:\s*(\d+)u64/);
                const optionBStakesMatch = poolData.match(/option_b_stakes:\s*(\d+)u64/);

                if (totalStakedMatch && optionAStakesMatch && optionBStakesMatch) {
                    const totalStaked = parseInt(totalStakedMatch[1]);
                    const optionAStakes = parseInt(optionAStakesMatch[1]);
                    const optionBStakes = parseInt(optionBStakesMatch[1]);

                    await db.updateMarketStats(market_id, totalStaked, optionAStakes, optionBStakes);
                }
            }
        } catch (e) {
            if (!(e as Error).message?.includes("not found")) {
                console.error(`Error syncing data for ${market_id}: ${(e as Error).message}`);
            }
        }
    }
}

// Check if a market exists on-chain
async function marketExistsOnChain(marketId: string): Promise<boolean> {
    try {
        const marketIdField = marketId.endsWith('field') ? marketId : stringToField(marketId);
        const poolData = await networkClient.getProgramMappingValue(
            PROGRAM_ID,
            "pools",
            marketIdField
        );
        return poolData !== null && poolData !== undefined;
    } catch {
        // "not found" means market doesn't exist on-chain
        return false;
    }
}

// Create a market on the Aleo blockchain
async function createMarketOnChain(market: MarketRow): Promise<boolean> {
    if (!ORACLE_PRIVATE_KEY || !ALEO_NODE_URL) {
        console.error("❌ Missing Oracle credentials in .env.");
        return false;
    }

    try {
        const { market_id, title, description, deadline, option_a_label, option_b_label } = market;

        console.log(`🚀 Creating market on-chain: ${title} (${market_id})`);

        // Convert strings to field format for Aleo
        const titleField = stringToField(title || "Market");
        const descField = stringToField(description || "Prediction market");
        const optionAField = stringToField(option_a_label || "YES");
        const optionBField = stringToField(option_b_label || "NO");
        const deadlineU64 = `${deadline}u64`;

        // Inputs for create_pool: title, description, options[2], deadline, token_id
        const tokenId = (market as MarketRow & { token_id?: string }).token_id || '0';
        const tokenIdField = `${tokenId}field`;

        const inputs = [
            titleField,
            descField,
            `[${optionAField}, ${optionBField}]`,
            deadlineU64,
            tokenIdField
        ];

        const fee = CREATE_POOL_FEE / 1_000_000;

        const executionResponse = await programManager.execute({
            programName: PROGRAM_ID,
            functionName: "create_pool",
            priorityFee: fee,
            privateFee: false,
            inputs: inputs,
            program: PROGRAM_SOURCE,
            keySearchParams: { cacheKey: `${PROGRAM_ID}:create_pool` }
        });

        console.log(`✅ Create Pool Transaction Broadcasted! ID: ${executionResponse}`);
        return true;
    } catch (e) {
        console.error(`SDK Error during market creation: ${(e as Error).message}`);
        return false;
    }
}

async function lockMarket(marketId: string): Promise<boolean> {
    if (!ORACLE_PRIVATE_KEY || !ALEO_NODE_URL) {
        console.error("❌ Missing Oracle credentials in .env.");
        return false;
    }

    try {
        console.log(`🔒 Authorizing lock for market ${marketId}...`);

        const marketIdField = stringToField(marketId);
        const inputs = [marketIdField];
        const fee = LOCK_POOL_FEE / 1_000_000;

        const executionResponse = await programManager.execute({
            programName: PROGRAM_ID,
            functionName: "lock_pool",
            priorityFee: fee,
            privateFee: false,
            inputs: inputs,
            program: PROGRAM_SOURCE,
            keySearchParams: { cacheKey: `${PROGRAM_ID}:lock_pool` }
        });

        console.log(`✅ Lock Transaction Broadcasted! ID: ${executionResponse}`);
        return true;
    } catch (e) {
        console.error(`SDK Error during locking: ${(e as Error).message}`);
        return false;
    }
}

async function resolveMarket(marketId: string, winningOption: number): Promise<boolean> {
    if (!ORACLE_PRIVATE_KEY || !ALEO_NODE_URL) {
        console.error("❌ Missing Oracle credentials in .env.");
        return false;
    }

    try {
        console.log(
            `🚀 Authorizing resolution for market ${marketId} with option ${winningOption}...`
        );

        const marketIdField = stringToField(marketId);
        const inputs = [marketIdField, `${winningOption}u64`];
        const fee = RESOLVE_POOL_FEE / 1_000_000;

        const executionResponse = await programManager.execute({
            programName: PROGRAM_ID,
            functionName: "resolve_pool",
            priorityFee: fee,
            privateFee: false,
            inputs: inputs,
            program: PROGRAM_SOURCE,
            keySearchParams: { cacheKey: `${PROGRAM_ID}:resolve_pool` }
        });

        console.log(`✅ Transaction Broadcasted! ID: ${executionResponse}`);
        return true;
    } catch (e) {
        console.error(`SDK Error during resolution: ${(e as Error).message}`);
        return false;
    }
}

export async function startWorker() {
    await initThreadPool();
    await db.initDb();
    console.log("🤖 Oracle Worker is running and monitoring pending markets...");

    setInterval(async () => {
        try {
            const currentTime = Math.floor(Date.now() / 1000);

            // 0. Sync on-chain stats (TVL, stakes)
            await syncOnChainData();

            // 1. Check for markets that need to be created on-chain
            const marketsNotOnChain = await db.getMarketsNotOnChain();
            for (const market of marketsNotOnChain) {
                const { market_id, title } = market;

                // First check if market already exists on-chain (in case previous tx succeeded but DB wasn't updated)
                const alreadyExists = await marketExistsOnChain(market_id);
                if (alreadyExists) {
                    console.log(`✅ Market "${title}" already exists on-chain. Updating DB...`);
                    await db.markOnChain(market_id);
                    continue;
                }

                console.log(`📝 Market "${title}" not on-chain. Creating...`);
                const success = await createMarketOnChain(market);
                if (success) {
                    // Note: Transaction was broadcasted but not yet confirmed
                    // The next sync cycle will verify if it exists on-chain
                    console.log(`📤 Market "${title}" creation transaction broadcasted. Will verify on next cycle.`);
                }
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // 1b. Verify pending on-chain transactions by checking if pools exist
            // This handles the case where transaction was broadcasted but markOnChain wasn't called
            for (const market of marketsNotOnChain) {
                const { market_id, title } = market;
                const existsNow = await marketExistsOnChain(market_id);
                if (existsNow) {
                    await db.markOnChain(market_id);
                    console.log(`✅ Verified: Market "${title}" confirmed on-chain.`);
                }
            }

            // 2. Handle Pending -> Locked (+ set reveal window)
            const pending = await db.getPendingMarkets();
            for (const market of pending) {
                const { market_id, deadline } = market;
                if (currentTime >= parseInt(deadline, 10)) {
                    console.log(`⏰ Deadline reached for market: ${market_id}. Locking...`);
                    const success = await lockMarket(market_id);
                    if (success) {
                        await db.markLocked(market_id);
                        // Set reveal window: users have REVEAL_WINDOW_SECONDS to reveal their predictions
                        const revealEnd = currentTime + REVEAL_WINDOW_SECONDS;
                        await db.setRevealWindowEnd(market_id, revealEnd);
                        console.log(`⏱️ Reveal window open until ${new Date(revealEnd * 1000).toISOString()} for market ${market_id}`);
                    }
                }
            }

            // 3. Handle Locked + Reveal window ended -> Resolve
            // (No admin reveal step — users reveal their own predictions on-chain)
            const revealed = await db.getMarketsReadyForResolution();
            for (const market of revealed) {
                const { market_id, threshold, metric_type } = market;

                console.log(`🔎 Resolution check for locked market: ${market_id} (Metric: ${metric_type})`);

                const handler = registry.getMetric(metric_type);
                if (!handler) {
                    console.error(`❌ No handler found for metric type: ${metric_type}`);
                    continue;
                }

                const value = await handler.fetchValue();
                if (value !== null) {
                    const winningOption = value >= parseFloat(threshold) ? 1 : 2;

                    const success = await resolveMarket(market_id, winningOption);
                    if (success) {
                        await db.markResolved(market_id);
                        await db.setWinningOption(market_id, winningOption);
                        // Set dispute window end
                        const disputeEnd = Math.floor(Date.now() / 1000) + DISPUTE_WINDOW_SECONDS;
                        await db.setDisputeWindowEnd(market_id, disputeEnd);
                        console.log(
                            `✅ Market ${market_id} resolved as ${winningOption === 1 ? "YES" : "NO"}. Dispute window until ${new Date(disputeEnd * 1000).toISOString()}`
                        );
                    }
                } else {
                    console.log(`⚠️ Could not fetch data for market ${market_id}, retrying next loop...`);
                }
            }
            // 4. Detect on-chain disputes (pool status 3 = disputed)
            const resolvedMarkets = await db.getAllMarkets();
            for (const market of resolvedMarkets) {
                if (market.status !== 'resolved') continue;
                try {
                    const marketIdField = market.market_id.endsWith('field') ? market.market_id : stringToField(market.market_id);
                    const poolData = await networkClient.getProgramMappingValue(
                        PROGRAM_ID,
                        "pools",
                        marketIdField
                    );
                    if (poolData) {
                        const statusMatch = poolData.match(/status:\s*(\d+)u8/);
                        if (statusMatch && parseInt(statusMatch[1]) === 3) {
                            console.log(`⚠️ Market ${market.market_id} disputed on-chain. Syncing to DB...`);
                            await db.markDisputed(market.market_id);
                        }
                    }
                } catch {
                    // ignore — market may not be on-chain
                }
            }
        } catch (e) {
            console.error("Error in worker loop:", (e as Error).message);
        }
    }, 60000); // 60 seconds
}

// Start worker if run directly
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startWorker().catch(console.error);
}
