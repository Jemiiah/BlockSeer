import express from "express";
import * as db from "./db.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Get all markets
app.get("/markets", async (req, res) => {
    try {
        const markets = await db.getAllMarkets();
        res.json(markets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending markets
app.get("/markets/pending", async (req, res) => {
    try {
        const markets = await db.getPendingMarkets();
        res.json(markets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get locked markets
app.get("/markets/locked", async (req, res) => {
    try {
        const markets = await db.getLockedMarkets();
        res.json(markets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    db.initDb();
});
