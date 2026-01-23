#!/bin/bash

echo "🚀 Setting up Multi-Tenant NGO AI Chatbot..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env and add your configuration values"
else
  echo "✓ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if DATABASE_URL is set
if grep -q "DATABASE_URL=postgresql://user:password@localhost:5432/ngo_chatbot" .env; then
  echo "⚠️  Please update DATABASE_URL in .env with your PostgreSQL connection string"
fi

# Run migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration (database, OpenAI API key, S3 credentials)"
echo "2. Run 'npm run db:seed' to create a demo tenant"
echo "3. Run 'npm run dev' to start the development server"
echo ""
