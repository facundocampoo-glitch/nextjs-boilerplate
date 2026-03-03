#!/bin/bash
set -e

echo "🧹 Cleaning Next dev (SAFE)..."

# Mata SOLO el dev server de Next, no todo node
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

# Borra lock si quedó colgado
rm -f .next/dev/lock 2>/dev/null || true

echo "🚀 Starting dev server (background) -> dev.log"
nohup npm run dev > dev.log 2>&1 & disown

echo "✅ Started. Tail log:"
tail -n 30 dev.log || true