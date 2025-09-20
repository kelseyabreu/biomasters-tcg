@echo off
echo 🚀 Starting Redis tunnel to GCP Memorystore...
echo 📍 This will create: localhost:6379 -> GCP Redis
echo 💡 Keep this window open while developing
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
    --ssh-flag="6379:10.36.239.107:6378"
