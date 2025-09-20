@echo off
echo 🔴 Setting up Redis SSH tunnel for local development...

REM Check if gcloud is installed
gcloud version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Google Cloud SDK not found. Please install it first:
    echo    https://cloud.google.com/sdk/docs/install
    exit /b 1
)
echo ✅ Google Cloud SDK found

REM Set up authentication using the service account key
set KEY_FILE=%~dp0gcp-keys\gcp-dev-key.json
if not exist "%KEY_FILE%" (
    echo ❌ Service account key file not found: %KEY_FILE%
    exit /b 1
)

echo 🔑 Authenticating with service account...
gcloud auth activate-service-account --key-file="%KEY_FILE%"
if %errorlevel% neq 0 (
    echo ❌ Failed to authenticate with service account
    exit /b 1
)
echo ✅ Authenticated successfully

REM Set the project
echo 🔧 Setting project to biomasters-tcg...
gcloud config set project biomasters-tcg

REM Create the SSH tunnel
echo 🚇 Creating SSH tunnel to Redis (Memorystore)...
echo    Local port: 6379
echo    Remote: 10.36.239.107:6378
echo    VM: biomasters-dev-vm (us-central1-a)
echo.
echo ⚠️  Keep this terminal open while developing!
echo    Press Ctrl+C to stop the tunnel
echo.

REM Start the tunnel
gcloud compute ssh biomasters-dev-vm --zone=us-central1-a --project=biomasters-tcg --ssh-flag="-L" --ssh-flag="6379:10.36.239.107:6378" --ssh-flag="-N"
