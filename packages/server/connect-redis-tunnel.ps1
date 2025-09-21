# Simple Redis SSH tunnel script for BioMasters TCG
Write-Host "Starting Redis SSH tunnel..." -ForegroundColor Green

# Check if gcloud is available
try {
    $null = Get-Command gcloud -ErrorAction Stop
    Write-Host "Google Cloud SDK found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Google Cloud SDK not found. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set up authentication
$keyFile = Join-Path $PSScriptRoot "gcp-keys/gcp-dev-key.json"
if (-not (Test-Path $keyFile)) {
    Write-Host "ERROR: Service account key not found: $keyFile" -ForegroundColor Red
    exit 1
}

Write-Host "Authenticating with service account..." -ForegroundColor Yellow
gcloud auth activate-service-account --key-file="$keyFile"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Authentication failed" -ForegroundColor Red
    exit 1
}

Write-Host "Setting project..." -ForegroundColor Yellow
gcloud config set project biomasters-tcg

Write-Host "Creating SSH tunnel to Redis..." -ForegroundColor Yellow
Write-Host "Local: localhost:6379 -> Remote: 10.36.239.107:6378" -ForegroundColor Cyan
Write-Host "VM: biomasters-dev-vm (us-central1-a)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Keep this window open while developing!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host ""

# Start the tunnel
gcloud compute ssh biomasters-dev-vm --zone=us-central1-a --project=biomasters-tcg --ssh-flag="-L" --ssh-flag="6379:10.36.239.107:6378" --ssh-flag="-N"
