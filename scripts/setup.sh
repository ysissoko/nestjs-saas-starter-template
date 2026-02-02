#!/bin/bash

# NestJS SaaS Starter Setup Script
# This script helps you set up your development environment

set -e

echo "=================================="
echo "NestJS SaaS Starter Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Your existing .env file was not modified."
        exit 0
    fi
fi

echo "📝 Creating .env file from .env.example..."
cp .env.example .env

echo ""
echo "Let's configure your environment variables:"
echo ""

# Database configuration
echo "=== Database Configuration ==="
read -p "Database host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database port [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Database username [root]: " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-root}

read -sp "Database password: " DB_PASSWORD
echo ""

read -p "Database name [nestjs_starter]: " DB_NAME
DB_NAME=${DB_NAME:-nestjs_starter}

# Generate secure secrets
echo ""
echo "=== Generating Secure Secrets ==="
echo "Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)

echo "Generating email verification secret..."
EMAIL_VERIFICATION_SECRET=$(openssl rand -base64 32)

echo "Generating password reset secret..."
PASSWORD_RESET_SECRET=$(openssl rand -base64 32)

# Email configuration
echo ""
echo "=== Email Configuration ==="
read -p "SMTP host [smtp.gmail.com]: " MAILER_HOST
MAILER_HOST=${MAILER_HOST:-smtp.gmail.com}

read -p "SMTP port [587]: " MAILER_PORT
MAILER_PORT=${MAILER_PORT:-587}

read -p "SMTP user (email): " MAILER_USER

read -sp "SMTP password (app password for Gmail): " MAILER_PASS
echo ""

# Write to .env
cat > .env << EOF
# Database
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# Auth Secrets
JWT_SECRET=$JWT_SECRET
EMAIL_VERIFICATION_SECRET=$EMAIL_VERIFICATION_SECRET
PASSWORD_RESET_SECRET=$PASSWORD_RESET_SECRET

# Email
MAILER_HOST=$MAILER_HOST
MAILER_PORT=$MAILER_PORT
MAILER_USER=$MAILER_USER
MAILER_PASS=$MAILER_PASS

# Application
NODE_ENV=development
PORT=3000

# Rate Limiting
RATE_LIMIT=300
RATE_LIMIT_TTL=60000
EOF

echo ""
echo -e "${GREEN}✅ .env file created successfully!${NC}"

# Install dependencies
echo ""
read -p "Install dependencies? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo -e "${GREEN}✅ Dependencies installed!${NC}"
fi

# Start database
echo ""
read -p "Start database with Docker? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🐳 Starting database..."
    docker-compose up -d mysql
    echo "⏳ Waiting for database to be ready..."
    sleep 10
    echo -e "${GREEN}✅ Database started!${NC}"
fi

# Run migrations
echo ""
read -p "Run database migrations? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🔄 Running migrations..."
    pnpm db:migrate
    echo -e "${GREEN}✅ Migrations completed!${NC}"
fi

# Seed database
echo ""
read -p "Seed database with initial data? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🌱 Seeding database..."
    pnpm db:seed
    echo -e "${GREEN}✅ Database seeded!${NC}"
fi

# Create admin user
echo ""
read -p "Create admin user? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "👤 Creating admin user..."
    pnpm tsx scripts/create-admin.ts
fi

echo ""
echo "=================================="
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Start the development server:"
echo "     ${YELLOW}pnpm backend:dev${NC}"
echo ""
echo "  2. Access API documentation:"
echo "     ${YELLOW}http://localhost:3000/api${NC}"
echo ""
echo "  3. Test your setup:"
echo "     ${YELLOW}curl http://localhost:3000/auth/me${NC}"
echo ""
echo "Happy coding! 🚀"
