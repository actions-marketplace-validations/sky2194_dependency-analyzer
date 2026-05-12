#!/bin/bash
# Security hardening deployment script

set -e

echo "🔐 Deploying security updates..."

# 1. Create log directory
echo "→ Creating log directory..."
sudo mkdir -p /var/log/dependency-analyzer
sudo chown www-data:www-data /var/log/dependency-analyzer
sudo chmod 755 /var/log/dependency-analyzer

# 2. Generate API secret if not exists
if ! grep -q "API_SECRET=" /var/www/dependency-analyzer/backend/.env 2>/dev/null; then
    echo "→ Generating API secret..."
    SECRET=$(openssl rand -hex 32)
    echo "API_SECRET=$SECRET" | sudo tee -a /var/www/dependency-analyzer/backend/.env > /dev/null
    echo "✅ Add this to Vercel env vars: VITE_API_SECRET=$SECRET"
fi

# 3. Secure .env file
echo "→ Securing .env file..."
sudo chmod 600 /var/www/dependency-analyzer/backend/.env
sudo chown www-data:www-data /var/www/dependency-analyzer/backend/.env

# 4. Update CORS header in backend
echo "→ Updating CORS to allow X-Signature header..."
# (Already done in code changes)

# 5. Restart service
echo "→ Restarting service..."
sudo systemctl restart dependency-analyzer

# 6. Test monitoring
echo "→ Testing monitoring..."
if [ -f /var/log/dependency-analyzer/access.log ]; then
    echo "✅ Monitoring active"
    tail -n 3 /var/log/dependency-analyzer/access.log
else
    echo "⚠️  Log file not created yet — will appear on first request"
fi

echo ""
echo "✅ Security deployment complete!"
echo ""
echo "Next steps:"
echo "1. Add to Vercel env: VITE_API_SECRET=<value from above>"
echo "2. Redeploy frontend on Vercel"
echo "3. Monitor logs: sudo tail -f /var/log/dependency-analyzer/access.log"
