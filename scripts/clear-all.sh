#!/bin/bash

# Clear all databases and in-memory state
# This script:
# 1. Deletes all .db files
# 2. Kills running services (which clears in-memory state)
# 3. Optionally restarts services

echo "🧹 Clearing all databases and in-memory state..."

# Delete all database files
rm -f packages/*/*.db
echo "✅ Database files deleted"

# Kill all services (this clears in-memory state)
echo "🛑 Stopping all services..."
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:4001 | xargs kill -9 2>/dev/null
echo "✅ Services stopped (in-memory state cleared)"

echo ""
echo "✨ All data cleared! Databases and in-memory state are now empty."
echo ""
echo "To restart services: npm run dev"
echo "To restart and seed: npm run reset"
