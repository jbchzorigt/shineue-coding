#!/bin/bash
# Piston tunnel сэргээгч: cloudflared-ийг дахин асааж, шинэ URL-ийг
# Vercel-д бүртгээд production-ийг redeploy хийнэ.
# Ажиллуулах: bash scripts/fix-piston-tunnel.sh
set -euo pipefail

LOG="/tmp/cloudflared-piston.log"

echo "1/5 Локал Piston шалгаж байна..."
if ! curl -s -m 5 http://localhost:2000/api/v2/runtimes | grep -q python; then
  echo "  Piston унтарсан байна — контейнерийг асааж байна..."
  docker start piston
  until curl -s -m 5 http://localhost:2000/api/v2/runtimes | grep -q python; do sleep 2; done
fi
echo "  OK"

echo "2/5 Хуучин tunnel-ийг зогсоож байна..."
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2

echo "3/5 Шинэ tunnel асааж байна..."
rm -f "$LOG"
nohup cloudflared tunnel --url http://localhost:2000 > "$LOG" 2>&1 &
until grep -qo "https://[a-z0-9-]*\.trycloudflare\.com" "$LOG" 2>/dev/null; do sleep 2; done
TUNNEL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" "$LOG" | head -1)
echo "  Шинэ URL: $TUNNEL"

echo "4/5 Vercel-ийн PISTON_URL-ийг шинэчилж байна..."
npx vercel env rm PISTON_URL production --yes > /dev/null 2>&1 || true
printf '%s' "$TUNNEL/api/v2" | npx vercel env add PISTON_URL production > /dev/null

echo "5/5 Production deploy хийж байна (1-2 минут)..."
npx vercel --prod --yes 2>&1 | grep -E "Aliased|Error" || true

echo ""
echo "Дууслаа! Шалгах: сайт дээрээ кодын даалгавар илгээгээд үзээрэй."
