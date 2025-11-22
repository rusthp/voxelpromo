#!/bin/bash

echo "🚀 VoxelPromo - Initialization Script"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found. Make sure MongoDB is installed and running, or use MongoDB Atlas."
else
    echo "✅ MongoDB detected"
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your credentials!"
else
    echo "✅ .env file already exists"
fi

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Initialization complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys and credentials"
echo "2. Make sure MongoDB is running"
echo "3. Run 'npm run dev' to start the application"
echo ""

