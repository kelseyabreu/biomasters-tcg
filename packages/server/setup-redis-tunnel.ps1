#!/usr/bin/env pwsh
# PowerShell script to set up Redis SSH tunnel for local development

Write-Host "🔴 Setting up Redis SSH tunnel for local development..." -ForegroundColor Red

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud not found"
    }
    Write-Host "✅ Google Cloud SDK found" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud SDK not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set up authentication using the service account key
$keyFile = Join-Path $PSScriptRoot "gcp-keys/gcp-dev-key.json"
if (-not (Test-Path $keyFile)) {
    Write-Host "❌ Service account key file not found: $keyFile" -ForegroundColor Red
    exit 1
}

Write-Host "🔑 Authenticating with service account..." -ForegroundColor Yellow
gcloud auth activate-service-account --key-file="$keyFile"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to authenticate with service account" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Authenticated successfully" -ForegroundColor Green

# Set the project
Write-Host "🔧 Setting project to biomasters-tcg..." -ForegroundColor Yellow
gcloud config set project biomasters-tcg

# Create the SSH tunnel
Write-Host "🚇 Creating SSH tunnel to Redis (Memorystore)..." -ForegroundColor Yellow
Write-Host "   Local port: 6379" -ForegroundColor Cyan
Write-Host "   Remote: 10.36.239.107:6378" -ForegroundColor Cyan
Write-Host "   VM: biomasters-dev-vm (us-central1-a)" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "⚠️  Keep this terminal open while developing!" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White

# Start the tunnel
gcloud compute ssh biomasters-dev-vm `
    --zone=us-central1-a `
    --project=biomasters-tcg `
    --ssh-flag="-L" `
    --ssh-flag="6379:10.36.239.107:6378" `
    --ssh-flag="-N"
