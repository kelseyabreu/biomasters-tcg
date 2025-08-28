#!/bin/bash

echo "🚀 Setting up Biomasters TCG Backend Server..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 12+ first."
    echo "   Install with: brew install postgresql (macOS) or apt-get install postgresql (Ubuntu)"
    exit 1
fi

# Check if Redis is available (optional)
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis is not installed. You can install it later or use a cloud Redis service."
    echo "   Install with: brew install redis (macOS) or apt-get install redis-server (Ubuntu)"
fi

echo "✅ Prerequisites check complete!"
echo

# Navigate to server directory
cd server

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo
    echo "⚠️  IMPORTANT: Please edit server/.env with your actual configuration:"
    echo "   - Firebase Admin SDK credentials"
    echo "   - PostgreSQL database connection"
    echo "   - Redis connection (if using)"
    echo "   - JWT secret key"
    echo
else
    echo "✅ Environment file already exists"
fi

# Create database (optional)
echo
read -p "🗄️  Create PostgreSQL database? (y/n): " create_db
if [[ $create_db =~ ^[Yy]$ ]]; then
    read -p "Enter database name (default: biomasters_tcg): " db_name
    db_name=${db_name:-biomasters_tcg}
    
    echo "Creating database $db_name..."
    createdb $db_name
    if [ $? -eq 0 ]; then
        echo "✅ Database $db_name created successfully"
    else
        echo "⚠️  Database creation failed. You may need to create it manually."
    fi
fi

echo
echo "🎉 Backend setup complete!"
echo
echo "📋 Next steps:"
echo "   1. Edit server/.env with your configuration"
echo "   2. Run: cd server && npm run db:migrate"
echo "   3. Run: npm run dev"
echo
echo "📚 Documentation: server/README.md"
echo "🌐 API will be available at: http://localhost:3001"
echo
