import "dotenv/config";
import * as db from "./db.js";
import { app, PORT } from "./api.js";
import { startWorker } from "./worker.js";

async function main() {
    // Initialize database first
    await db.initDb();

    // Start Express API server
    app.listen(PORT, () => {
        console.log(`🚀 API Server running on http://localhost:${PORT}`);
    });

    // Start background worker (market lifecycle: create → lock → resolve → disputes)
    console.log("🤖 Starting Oracle Worker alongside API...");
    await startWorker();

    console.log("✅ Oracle running: API + Worker in single process");
}

main().catch((err) => {
    console.error("❌ Fatal error starting Oracle:", err);
    process.exit(1);
});
