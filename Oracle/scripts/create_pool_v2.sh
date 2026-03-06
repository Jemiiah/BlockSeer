#!/bin/bash
# Auto-deployment script for creating pools on-chain
# Reads parameters from JSON file to avoid escaping issues

set -e

PARAMS_FILE=$1

if [ ! -f "$PARAMS_FILE" ]; then
    echo "Error: Parameters file not found: $PARAMS_FILE"
    exit 1
fi

# Read parameters from JSON
POOL_ID=$(jq -r '.pool_id' "$PARAMS_FILE")
TITLE=$(jq -r '.title' "$PARAMS_FILE")
DESC=$(jq -r '.description' "$PARAMS_FILE")
OPTION_A=$(jq -r '.option_a' "$PARAMS_FILE")
OPTION_B=$(jq -r '.option_b' "$PARAMS_FILE")
DEADLINE=$(jq -r '.deadline' "$PARAMS_FILE")
TOKEN_ID=$(jq -r '.token_id' "$PARAMS_FILE")

cd "$(dirname "$0")/../../prediction"

# Load private key from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🚀 Creating pool: $POOL_ID"

leo execute create_pool \
    "$POOL_ID" \
    "$TITLE" \
    "$DESC" \
    "[$OPTION_A, $OPTION_B]" \
    "$DEADLINE" \
    "$TOKEN_ID" \
    --network testnet \
    --endpoint https://api.explorer.provable.com/v1 \
    --broadcast \
    -y 2>&1 | tee /tmp/pool_creation.log

# Check if successful
if grep -q "Transaction accepted\|Execution confirmed" /tmp/pool_creation.log; then
    echo "✅ Pool created"
    rm -f "$PARAMS_FILE"
    exit 0
else
    echo "❌ Failed"
    exit 1
fi
