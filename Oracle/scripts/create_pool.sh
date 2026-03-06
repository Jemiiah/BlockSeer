#!/bin/bash
# Auto-deployment script for creating pools on-chain
# Called by Oracle worker as a workaround for SDK bugs

set -e

POOL_ID=$1
TITLE=$2
DESC=$3
OPTIONS=$4  # Full array string like "[123field, 456field]"
DEADLINE=$5
TOKEN_ID=$6

if [ -z "$POOL_ID" ] || [ -z "$DEADLINE" ]; then
    echo "Usage: create_pool.sh <pool_id> <title> <desc> <options_array> <deadline> <token_id>"
    exit 1
fi

cd "$(dirname "$0")/../../prediction"

# Load private key from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🚀 Creating pool on-chain: $POOL_ID"

leo execute create_pool \
    "$POOL_ID" \
    "$TITLE" \
    "$DESC" \
    "$OPTIONS" \
    "$DEADLINE" \
    "$TOKEN_ID" \
    --network testnet \
    --endpoint https://api.explorer.provable.com/v1 \
    --broadcast \
    -y 2>&1 | tee /tmp/pool_creation.log

# Check if successful
if grep -q "Transaction accepted" /tmp/pool_creation.log || grep -q "Execution confirmed" /tmp/pool_creation.log; then
    echo "✅ Pool created successfully"
    exit 0
else
    echo "❌ Pool creation failed"
    exit 1
fi
