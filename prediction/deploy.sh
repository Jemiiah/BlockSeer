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

echo -e "${YELLOW}Building manifoldpredictionv2.aleo...${NC}"

leo clean
leo build || {
    echo -e "${RED}Failed to build manifoldpredictionv2.aleo${NC}"
    exit 1
}

echo -e "${YELLOW}Deploying manifoldpredictionv2.aleo to Testnet...${NC}"

leo deploy --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast --save "./deploy_tx" --print || {
    echo -e "${RED}Failed to deploy manifoldpredictionv2.aleo${NC}"
    exit 1
}

echo -e "${GREEN}Contract deployed successfully${NC}"

echo -e "${YELLOW}Initializing Treasury...${NC}"

leo execute initialize --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast || {
    echo -e "${RED}Failed to initialize treasury${NC}"
    exit 1
}

echo -e "${GREEN}Treasury initialized successfully${NC}"
