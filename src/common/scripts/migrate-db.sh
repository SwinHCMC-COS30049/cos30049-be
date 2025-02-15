#!/bin/bash

# Get the directory where the script is located and navigate up to project root
SCRIPT_DIR=$(dirname $(realpath "$0"))
PROJECT_ROOT="$SCRIPT_DIR/../../.."
ENV_FILE="$PROJECT_ROOT/.env"

# Extract EdgeDB values from .env file
EDGEDB_INSTANCE=$(grep EDGEDB_INSTANCE "$ENV_FILE" | sed 's/^.*=//')
EDGEDB_SECRET_KEY=$(grep EDGEDB_SECRET_KEY "$ENV_FILE" | sed 's/^.*=//')

# Export the EdgeDB variables
export EDGEDB_INSTANCE
export EDGEDB_SECRET_KEY

BRANCH="main"
echo "
              🌟 CRYPTO EDGEDB MIGRATION 🌟
"

export EDGEDB_BRANCH=$BRANCH

echo "🚀 Running migrations with instance: ${EDGEDB_INSTANCE}"
edgedb migration apply

echo "
✨ Migrations complete! Your database schema should be updated! ✨
"
