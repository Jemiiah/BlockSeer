#!/bin/bash

echo "Starting Manifold Contract Deployment..."

command -v leo >/dev/null 2>&1 || { echo "Leo CLI not found. Please install Leo SDK."; exit 1; }

if [ -f .env ]; then
    echo "Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found. Ensure PRIVATE_KEY is set in your shell."
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Building manifoldpredictionv6.aleo...${NC}"

leo clean
leo build || {
    echo -e "${RED}Failed to build manifoldpredictionv6.aleo${NC}"
    exit 1
}

echo -e "${YELLOW}Deploying manifoldpredictionv6.aleo to Testnet...${NC}"

leo deploy --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast --save "./deploy_tx" --print -y || {
    echo -e "${RED}Failed to deploy manifoldpredictionv6.aleo${NC}"
    exit 1
}

echo -e "${GREEN}Contract deployed successfully${NC}"
