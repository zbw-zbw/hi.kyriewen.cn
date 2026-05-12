#!/bin/bash
set -e

echo "=== Content Proxy Deploy Script ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
  echo "Error: docker compose not available"
  exit 1
fi

# Create .env if not exists
if [ ! -f .env ]; then
  GENERATED_SECRET=$(openssl rand -hex 32)
  echo "PROXY_SECRET=${GENERATED_SECRET}" > .env
  echo "Generated PROXY_SECRET: ${GENERATED_SECRET}"
  echo "⚠️  Save this secret! You need to set it as CONTENT_PROXY_SECRET in Vercel."
fi

# Build and start
echo "Building and starting content-proxy..."
docker compose up -d --build

echo ""
echo "✅ Content proxy deployed!"
echo ""
echo "Test with:"
echo "  curl http://localhost:3100/health"
echo ""
echo "Next steps:"
echo "  1. Configure Nginx/Caddy reverse proxy with HTTPS"
echo "  2. Add CONTENT_PROXY_URL and CONTENT_PROXY_SECRET to Vercel env vars"
