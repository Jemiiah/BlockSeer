import fs from "fs";
import * as db from "../db.js";

/**
 * Load markets into database without creating on-chain
 * This bypasses the Aleo SDK proving key download issue
 */
async function loadMarketsDbOnly() {
    const data = JSON.parse(fs.readFileSync("./markets.json", "utf-8"));
    console.log(`📂 Loading ${data.length} markets to database...`);

    await db.initDb();

    for (const m of data) {
        try {
            console.log(`\n⏳ Adding to DB: ${m.title}...`);

            // Convert title to field (same logic as cli.ts)
            const stringToField = (str: string): string => {
                const buffer = Buffer.from(str, "utf8");
                let hex = buffer.toString("hex");
                if (buffer.length > 31) hex = buffer.subarray(0, 31).toString("hex");
                const bigInt = BigInt("0x" + hex);
                return `${bigInt}field`;
            };

            const marketId = stringToField(m.title);

            await db.addMarket(
                marketId,
                m.title,
                m.snapshotTime,
                m.threshold,
                m.metric,
                m.description,
                m.optionA || "YES",
                m.optionB || "NO",
                "0field" // token_id (default ALEO)
            );

            console.log(`✅ ${m.title} added to database`);
        } catch (e: any) {
            console.error(`⚠️ Failed to add ${m.title}: ${e.message}`);
        }
    }

    console.log(`\n✅ Done! Markets added to database. The worker will create them on-chain automatically.`);
}

loadMarketsDbOnly();
