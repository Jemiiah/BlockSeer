import "dotenv/config";
import express from "express";
import cors from "cors";
import * as db from "./db.js";
import type { MarketRow } from "./types.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3001', 'http://localhost:3002'];

// Enable CORS for specific origins
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));


app.use(express.json());

// Get all markets (includes reveal_window_end for commit-reveal UX)
app.get("/markets", async (req, res) => {
    try {
        const markets = await db.getAllMarkets();
        // Ensure reveal_window_end is included as a number (or null)
        const enriched = markets.map((m: MarketRow) => ({
            ...m,
            reveal_window_end: m.reveal_window_end ? parseInt(m.reveal_window_end, 10) : null,
        }));
        res.json(enriched);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Get pending markets
app.get("/markets/pending", async (req, res) => {
    try {
        const markets = await db.getPendingMarkets();
        res.json(markets);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Get locked markets
app.get("/markets/locked", async (req, res) => {
    try {
        const markets = await db.getLockedMarkets();
        res.json(markets);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Get market by ID
app.get("/markets/:id", async (req, res) => {
    try {
        const market = await db.getMarketById(req.params.id);
        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }
        res.json(market);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Create a new market
app.post("/markets", async (req, res) => {
    try {
        const {
            title,
            description,
            option_a_label,
            option_b_label,
            metric_type,
            threshold,
            deadline
        } = req.body;

        // Validate required fields
        if (!title || !deadline || !threshold) {
            return res.status(400).json({
                error: "Missing required fields: title, deadline, threshold"
            });
        }

        // Validate title length and content
        const trimmedTitle = String(title).trim();
        if (trimmedTitle.length === 0 || trimmedTitle.length > 200) {
            return res.status(400).json({
                error: "Title must be between 1 and 200 characters"
            });
        }

        // Validate deadline is a reasonable future timestamp
        const parsedDeadline = parseInt(deadline);
        const now = Math.floor(Date.now() / 1000);
        if (isNaN(parsedDeadline) || parsedDeadline <= now) {
            return res.status(400).json({
                error: "Deadline must be a future Unix timestamp"
            });
        }
        const maxDeadline = now + 365 * 24 * 3600; // 1 year max
        if (parsedDeadline > maxDeadline) {
            return res.status(400).json({
                error: "Deadline cannot be more than 1 year in the future"
            });
        }

        // Validate threshold is a number
        const parsedThreshold = parseFloat(threshold);
        if (isNaN(parsedThreshold)) {
            return res.status(400).json({
                error: "Threshold must be a valid number"
            });
        }

        // Generate market ID from title hash (similar to Leo program)
        const marketId = generateMarketId(trimmedTitle);

        await db.addMarket(
            marketId,
            trimmedTitle,
            parsedDeadline,
            parsedThreshold,
            metric_type || 'generic',
            description || '',
            option_a_label || 'YES',
            option_b_label || 'NO'
        );

        res.status(201).json({
            success: true,
            market_id: marketId,
            message: "Market created successfully"
        });
    } catch (error) {
        console.error("Error creating market:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// Helper function to generate market ID
// Note: This won't match BHP256::hash_to_field exactly, but provides a deterministic ID
// The on-chain pool ID is generated by the Leo program using BHP256::hash_to_field(title_field)
function generateMarketId(title: string): string {
    // Convert title to a field-compatible format
    const buffer = Buffer.from(title, 'utf8');
    // Truncate to 31 bytes (max field element size)
    const truncated = buffer.length > 31 ? buffer.subarray(0, 31) : buffer;
    // Convert to hex then to bigint for deterministic ID
    const hex = truncated.toString('hex');
    const bigInt = BigInt('0x' + hex);
    // Use the bigint as the field value (deterministic, no timestamp)
    return `${bigInt}field`;
}

// Manually resolve a market (for generic/manual markets)
app.post("/markets/:id/resolve", async (req, res) => {
    try {
        const { id } = req.params;
        const { winning_option } = req.body;

        if (!winning_option || (winning_option !== 1 && winning_option !== 2)) {
            return res.status(400).json({
                error: "winning_option must be 1 or 2"
            });
        }

        const market = await db.getMarketById(id);
        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }

        if (market.status !== 'locked') {
            return res.status(400).json({
                error: `Market must be locked to resolve. Current status: ${market.status}`
            });
        }

        await db.markResolved(id);

        res.json({
            success: true,
            market_id: id,
            winning_option,
            message: `Market resolved with option ${winning_option}`
        });
    } catch (error) {
        console.error("Error resolving market:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// Lock a market manually
app.post("/markets/:id/lock", async (req, res) => {
    try {
        const { id } = req.params;

        const market = await db.getMarketById(id);
        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }

        if (market.status !== 'pending') {
            return res.status(400).json({
                error: `Market must be pending to lock. Current status: ${market.status}`
            });
        }

        await db.markLocked(id);

        res.json({
            success: true,
            market_id: id,
            message: "Market locked successfully"
        });
    } catch (error) {
        console.error("Error locking market:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// Report a prediction (blind betting — frontend reports predictions off-chain)
app.post("/predictions", async (req, res) => {
    try {
        const { prediction_id, market_id, option, amount, tx_id } = req.body;

        // Validate required fields
        if (!prediction_id || !market_id || !option || !amount) {
            return res.status(400).json({
                error: "Missing required fields: prediction_id, market_id, option, amount"
            });
        }

        if (option !== 1 && option !== 2) {
            return res.status(400).json({ error: "option must be 1 or 2" });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: "amount must be a positive number" });
        }

        // Validate market exists and is pending
        const market = await db.getMarketById(market_id);
        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }

        if (market.status !== 'pending') {
            return res.status(400).json({
                error: `Market is not accepting predictions. Current status: ${market.status}`
            });
        }

        // Check for duplicate prediction ID
        const exists = await db.predictionExists(prediction_id);
        if (exists) {
            return res.status(409).json({ error: "Prediction already reported" });
        }

        await db.addPrediction(prediction_id, market_id, option, amount, tx_id || null);

        res.status(201).json({
            success: true,
            prediction_id,
            message: "Prediction recorded"
        });
    } catch (error) {
        console.error("Error recording prediction:", error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// Get available metric types
app.get("/metrics", (req, res) => {
    res.json({
        metrics: [
            { name: "eth_price", description: "Ethereum price in USD" },
            { name: "btc_price", description: "Bitcoin price in USD" },
            { name: "eth_gas_price", description: "Ethereum gas price in gwei" },
            { name: "btc_dominance", description: "BTC #1 by market cap (1=yes, 0=no)" },
            { name: "eth_staking_rate", description: "Ethereum staking APR %" },
            { name: "fear_greed", description: "Crypto Fear & Greed Index (0-100)" },
            { name: "stablecoin_peg", description: "Stablecoin peg status" },
            { name: "generic", description: "Manual resolution by admin" },
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    db.initDb();
});
