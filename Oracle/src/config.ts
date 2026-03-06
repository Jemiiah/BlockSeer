import dotenv from "dotenv";
import type { DbPoolConfig } from "./types.js";

dotenv.config();

export const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || "";
export const ALEO_NODE_URL = process.env.ALEO_NODE_URL || "";
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// PostgreSQL Configuration
export const DB_CONFIG: DbPoolConfig = {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432"),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "oracle_db",
};

if (process.env.PGSSL === "true") {
    DB_CONFIG.ssl = { rejectUnauthorized: false };
}

export const PROGRAM_ID = "manifoldpredictionv6.aleo";
export const ALEO_BROADCAST_URL = `${ALEO_NODE_URL}/testnet/transaction/broadcast`;

// Costs
export const CREATE_POOL_FEE = 2_000_000;
export const LOCK_POOL_FEE = 500_000;
export const RESOLVE_POOL_FEE = 1_000_000;
export const CANCEL_POOL_FEE = 500_000;

// Reveal window: how long users have to reveal after pool locks (seconds)
export const REVEAL_WINDOW_SECONDS = 3600; // 1 hour

// Dispute window: how long users can dispute after resolution (seconds)
export const DISPUTE_WINDOW_SECONDS = 86400; // 24 hours

// Protocol fee
export const PROTOCOL_FEE_BPS = 200; // 2%

// Embedded Program Source (v5 — stablecoin, fees, disputes, self-claim)
export const PROGRAM_SOURCE = `import credits.aleo;
import token_registry.aleo;
program manifoldpredictionv6.aleo;

record Prediction:
    owner as address.private;
    id as field.private;
    pool_id as field.private;
    option as u64.private;
    amount as u64.private;
    claimed as boolean.private;
    token_id as field.private;

struct Pool:
    id as field;
    title as field;
    description as field;
    options as [field; 2u32];
    deadline as u64;
    status as u8;
    winning_option as u64;
    total_staked as u64;
    option_a_stakes as u64;
    option_b_stakes as u64;
    total_no_of_stakes as u64;
    total_no_of_stakes_option_a as u64;
    total_no_of_stakes_option_b as u64;
    token_id as field;
    resolved_at as u64;

struct Default:
    id as u32;

mapping pools:
    key as field.public;
    value as Pool.public;

mapping total_predictions:
    key as field.public;
    value as u64.public;

mapping commitments:
    key as field.public;
    value as field.public;

mapping claims:
    key as field.public;
    value as boolean.public;

mapping dispute_count:
    key as field.public;
    value as u64.public;

mapping pool_balance:
    key as field.public;
    value as u64.public;

mapping pools_id__:
    key as u32.public;
    value as field.public;

mapping pools_id__len__:
    key as boolean.public;
    value as u32.public;

mapping user_predictions__:
    key as u32.public;
    value as field.public;

mapping user_predictions__len__:
    key as boolean.public;
    value as u32.public;
`;
