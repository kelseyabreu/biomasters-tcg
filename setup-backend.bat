@echo off
echo 🚀 Setting up Biomasters TCG Backend Server...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed. Please install PostgreSQL 12+ first.
    echo    Download from: https://www.postgresql.org/download/
    pause
    exit /b 1
)

:: Check if Redis is available (optional)
redis-cli --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Redis is not installed. You can install it later or use a cloud Redis service.
    echo    For Windows: https://github.com/microsoftarchive/redis/releases
)

echo ✅ Prerequisites check complete!
echo.

:: Navigate to server directory
cd server

:: Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

:: Copy environment file
if not exist .env (
    echo 📝 Creating environment file...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Please edit server/.env with your actual configuration:
    echo    - Firebase Admin SDK credentials
    echo    - PostgreSQL database connection
    echo    - Redis connection (if using)
    echo    - JWT secret key
    echo.
) else (
    echo ✅ Environment file already exists
)

:: Create database (optional)
echo.
set /p create_db="🗄️  Create PostgreSQL database? (y/n): "
if /i "%create_db%"=="y" (
    set /p db_name="Enter database name (default: biomasters_tcg): "
    if "%db_name%"=="" set db_name=biomasters_tcg
    
    echo Creating database %db_name%...
    createdb %db_name%
    if %errorlevel% equ 0 (
        echo ✅ Database %db_name% created successfully
    ) else (
        echo ⚠️  Database creation failed. You may need to create it manually.
    )
)

echo.
echo 🎉 Backend setup complete!
echo.
echo 📋 Next steps:
echo    1. Edit server/.env with your configuration
echo    2. Run: cd server && npm run db:migrate
echo    3. Run: npm run dev
echo.
echo 📚 Documentation: server/README.md
echo 🌐 API will be available at: http://localhost:3001
echo.
pause
