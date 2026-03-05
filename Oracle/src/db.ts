import pg from "pg";
const { Pool } = pg;
import { DB_CONFIG } from "./config.js";
import type { MarketRow, AggregateStakes } from "./types.js";

const pool = new Pool(DB_CONFIG);

export async function getAllMarkets(): Promise<MarketRow[]> {
    try {
        const query = `SELECT * FROM markets`;
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error("Error fetching all markets:", (err as Error).message);
        throw err;
    }
}

export async function initDb(): Promise<void> {
    const query = `
    CREATE TABLE IF NOT EXISTS markets (
        market_id TEXT PRIMARY KEY,
        title TEXT,
        deadline BIGINT,
        threshold DECIMAL,
        status TEXT DEFAULT 'pending',
        metric_type TEXT DEFAULT 'eth_staking_rate',
        description TEXT,
        option_a_label TEXT DEFAULT 'YES',
        option_b_label TEXT DEFAULT 'NO',
        total_staked BIGINT DEFAULT 0,
        option_a_stakes BIGINT DEFAULT 0,
        option_b_stakes BIGINT DEFAULT 0,
        on_chain BOOLEAN DEFAULT FALSE
    )
    `;
    try {
        await pool.query(query);
        // Ensure columns exist for existing tables
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS title TEXT`);
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS option_a_label TEXT DEFAULT 'YES'`);
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS option_b_label TEXT DEFAULT 'NO'`);
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS on_chain BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS reveal_window_end BIGINT`);
        // v5 columns
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS token_id TEXT DEFAULT '0'`);
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS dispute_window_end BIGINT`);
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS winning_option INTEGER`);
        await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE`);

        // Predictions table for blind betting — tracks predictions off-chain
        await pool.query(`
            CREATE TABLE IF NOT EXISTS predictions (
                prediction_id TEXT PRIMARY KEY,
                market_id TEXT NOT NULL,
                option INTEGER NOT NULL CHECK (option IN (1, 2)),
                amount BIGINT NOT NULL,
                tx_id TEXT,
                reported_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log("Database initialized successfully (PostgreSQL).");
    } catch (err) {
        console.error("Database initialization error:", (err as Error).message);
        throw err;
    }
}

export async function addMarket(
    marketId: string,
    title: string,
    deadline: number,
    threshold: number,
    metricType: string = "eth_staking_rate",
    description: string = "",
    optionALabel: string = "YES",
    optionBLabel: string = "NO",
    tokenId: string = "0"
): Promise<void> {
    const query = `
    INSERT INTO markets (market_id, title, deadline, threshold, status, metric_type, description, option_a_label, option_b_label, token_id)
    VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9)
    ON CONFLICT (market_id) DO UPDATE SET
        title = EXCLUDED.title,
        deadline = EXCLUDED.deadline,
        threshold = EXCLUDED.threshold,
        metric_type = EXCLUDED.metric_type,
        description = EXCLUDED.description,
        option_a_label = EXCLUDED.option_a_label,
        option_b_label = EXCLUDED.option_b_label,
        token_id = EXCLUDED.token_id
    `;
    try {
        await pool.query(query, [marketId, title, deadline, threshold, metricType, description, optionALabel, optionBLabel, tokenId]);
        console.log(`Market ${marketId} added to DB (Metric: ${metricType}, Token: ${tokenId}).`);
    } catch (err) {
        console.error(`Error adding market ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function getPendingMarkets(): Promise<MarketRow[]> {
    try {
        const query = `SELECT * FROM markets WHERE status = 'pending'`;
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error("Error fetching pending markets:", (err as Error).message);
        throw err;
    }
}

export async function getLockedMarkets(): Promise<MarketRow[]> {
    try {
        const query = `SELECT * FROM markets WHERE status = 'locked'`;
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error("Error fetching locked markets:", (err as Error).message);
        throw err;
    }
}

export async function markLocked(marketId: string): Promise<void> {
    const query = `UPDATE markets SET status = 'locked' WHERE market_id = $1`;
    try {
        await pool.query(query, [marketId]);
        console.log(`Market ${marketId} marked as locked in DB.`);
    } catch (err) {
        console.error(`Error marking market ${marketId} as locked:`, (err as Error).message);
        throw err;
    }
}

export async function markResolved(marketId: string): Promise<void> {
    const query = `UPDATE markets SET status = 'resolved' WHERE market_id = $1`;
    try {
        await pool.query(query, [marketId]);
        console.log(`Market ${marketId} marked as resolved.`);
    } catch (err) {
        console.error(`Error marking market ${marketId} as resolved:`, (err as Error).message);
        throw err;
    }
}

export async function markDisputed(marketId: string): Promise<void> {
    const query = `UPDATE markets SET status = 'disputed' WHERE market_id = $1`;
    try {
        await pool.query(query, [marketId]);
        console.log(`Market ${marketId} marked as disputed.`);
    } catch (err) {
        console.error(`Error marking market ${marketId} as disputed:`, (err as Error).message);
        throw err;
    }
}

export async function markCancelled(marketId: string): Promise<void> {
    const query = `UPDATE markets SET status = 'cancelled', cancelled = TRUE WHERE market_id = $1`;
    try {
        await pool.query(query, [marketId]);
        console.log(`Market ${marketId} marked as cancelled.`);
    } catch (err) {
        console.error(`Error marking market ${marketId} as cancelled:`, (err as Error).message);
        throw err;
    }
}

export async function setWinningOption(marketId: string, winningOption: number): Promise<void> {
    const query = `UPDATE markets SET winning_option = $1 WHERE market_id = $2`;
    try {
        await pool.query(query, [winningOption, marketId]);
        console.log(`Market ${marketId} winning option set to ${winningOption}.`);
    } catch (err) {
        console.error(`Error setting winning option for ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function setDisputeWindowEnd(marketId: string, timestamp: number): Promise<void> {
    const query = `UPDATE markets SET dispute_window_end = $1 WHERE market_id = $2`;
    try {
        await pool.query(query, [timestamp, marketId]);
        console.log(`Market ${marketId} dispute window ends at ${new Date(timestamp * 1000).toISOString()}.`);
    } catch (err) {
        console.error(`Error setting dispute window for ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function getDisputedMarkets(): Promise<MarketRow[]> {
    try {
        const query = `SELECT * FROM markets WHERE status = 'disputed'`;
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error("Error fetching disputed markets:", (err as Error).message);
        throw err;
    }
}

export async function updateMarketStats(
    marketId: string,
    totalStaked: number,
    optionAStakes: number,
    optionBStakes: number
): Promise<void> {
    const query = `
    UPDATE markets
    SET total_staked = $1, option_a_stakes = $2, option_b_stakes = $3
    WHERE market_id = $4
    `;
    try {
        await pool.query(query, [totalStaked, optionAStakes, optionBStakes, marketId]);
        console.log(`Updated on-chain stats for market ${marketId}.`);
    } catch (err) {
        console.error(`Error updating stats for market ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function updateMarketMetadata(
    marketId: string,
    optionALabel: string,
    optionBLabel: string
): Promise<void> {
    const query = `
    UPDATE markets
    SET option_a_label = $1, option_b_label = $2
    WHERE market_id = $3
    `;
    try {
        await pool.query(query, [optionALabel, optionBLabel, marketId]);
        console.log(`Updated labels for market ${marketId}.`);
    } catch (err) {
        console.error(`Error updating metadata for market ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function getMarketById(marketId: string): Promise<MarketRow | null> {
    try {
        const query = `SELECT * FROM markets WHERE market_id = $1`;
        const { rows } = await pool.query(query, [marketId]);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error(`Error fetching market ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function getMarketsNotOnChain(): Promise<MarketRow[]> {
    try {
        const query = `SELECT * FROM markets WHERE (on_chain = FALSE OR on_chain IS NULL) AND status = 'pending'`;
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error("Error fetching markets not on chain:", (err as Error).message);
        throw err;
    }
}

export async function markOnChain(marketId: string): Promise<void> {
    const query = `UPDATE markets SET on_chain = TRUE WHERE market_id = $1`;
    try {
        await pool.query(query, [marketId]);
        console.log(`Market ${marketId} marked as on-chain in DB.`);
    } catch (err) {
        console.error(`Error marking market ${marketId} as on-chain:`, (err as Error).message);
        throw err;
    }
}

// --- Blind Betting: Prediction tracking ---

export async function addPrediction(
    predictionId: string,
    marketId: string,
    option: number,
    amount: number,
    txId: string | null
): Promise<void> {
    const query = `
    INSERT INTO predictions (prediction_id, market_id, option, amount, tx_id)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (prediction_id) DO NOTHING
    `;
    try {
        await pool.query(query, [predictionId, marketId, option, amount, txId]);
        console.log(`Prediction ${predictionId} recorded for market ${marketId}.`);
    } catch (err) {
        console.error(`Error adding prediction ${predictionId}:`, (err as Error).message);
        throw err;
    }
}

export async function getMarketAggregateStakes(marketId: string): Promise<AggregateStakes> {
    const query = `
    SELECT
        COALESCE(SUM(amount), 0) AS total_staked,
        COALESCE(SUM(CASE WHEN option = 1 THEN amount ELSE 0 END), 0) AS option_a_stakes,
        COALESCE(SUM(CASE WHEN option = 2 THEN amount ELSE 0 END), 0) AS option_b_stakes
    FROM predictions
    WHERE market_id = $1
    `;
    try {
        const { rows } = await pool.query(query, [marketId]);
        return {
            total_staked: parseInt(rows[0].total_staked, 10),
            option_a_stakes: parseInt(rows[0].option_a_stakes, 10),
            option_b_stakes: parseInt(rows[0].option_b_stakes, 10),
        };
    } catch (err) {
        console.error(`Error fetching aggregate stakes for ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function setRevealWindowEnd(marketId: string, timestamp: number): Promise<void> {
    const query = `UPDATE markets SET reveal_window_end = $1 WHERE market_id = $2`;
    try {
        await pool.query(query, [timestamp, marketId]);
        console.log(`Market ${marketId} reveal window ends at ${new Date(timestamp * 1000).toISOString()}.`);
    } catch (err) {
        console.error(`Error setting reveal window for ${marketId}:`, (err as Error).message);
        throw err;
    }
}

export async function getMarketsReadyForResolution(): Promise<MarketRow[]> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const query = `SELECT * FROM markets WHERE status = 'locked' AND reveal_window_end IS NOT NULL AND reveal_window_end < $1`;
        const { rows } = await pool.query(query, [currentTime]);
        return rows;
    } catch (err) {
        console.error("Error fetching markets ready for resolution:", (err as Error).message);
        throw err;
    }
}

export async function predictionExists(predictionId: string): Promise<boolean> {
    try {
        const query = `SELECT 1 FROM predictions WHERE prediction_id = $1`;
        const { rows } = await pool.query(query, [predictionId]);
        return rows.length > 0;
    } catch (err) {
        console.error(`Error checking prediction ${predictionId}:`, (err as Error).message);
        throw err;
    }
}
