@echo off
REM ============================================================================
REM Redis SSH Tunnel Script - LOCAL DEVELOPMENT
REM ============================================================================
REM Purpose: Quick Redis tunnel setup for local development
REM Authentication: Uses your personal gcloud authentication (gcloud auth login)
REM Usage: npm run redis:tunnel
REM
REM For CI/CD/Build Pipeline: Use connect-redis-tunnel.ps1 instead
REM ============================================================================

echo 🚀 Starting Redis tunnel to GCP Memorystore...
echo 📍 This will create: localhost:6379 -> GCP Redis
echo 💡 Keep this window open while developing
echo 🔑 Using your personal gcloud authentication
echo.

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ gcloud CLI not found. Please install Google Cloud SDK:
    echo    https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo 🔄 Creating SSH tunnel...
echo 💡 Press Ctrl+C to stop the tunnel
echo.

gcloud compute ssh biomasters-dev-vm ^
    --zone=us-central1-a ^
    --project=biomasters-tcg ^
    --ssh-flag="-L" ^
    --ssh-flag="6379:10.36.239.107:6378" ^
    --ssh-flag="-N"
