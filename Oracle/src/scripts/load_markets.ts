import fs from "fs";
import { createMarket } from "../cli.js";

async function loadMarkets() {
    const data = JSON.parse(fs.readFileSync("./markets.json", "utf-8"));
    console.log(`📂 Loading ${data.length} markets...`);

    for (const m of data) {
        try {
            console.log(`\n⏳ Creating: ${m.title}...`);
            await createMarket(
                m.title,
                m.threshold,
                m.snapshotTime,
                m.metric,
                m.description,
                m.optionA || "YES",
                m.optionB || "NO"
            );
        } catch (e: any) {
            console.error(`⚠️ Failed to create ${m.title}: ${e.message}`);
        }
    }
}

loadMarkets();
