#!/usr/bin/env node

/**
 * Deploy BioMasters TCG Server to Google Cloud Run
 *
 * Usage:
 *   npm run deploy:dev          # Uses .env.development with local Docker build (fast)
 *   npm run deploy:devNoDocker  # Uses .env.development with Cloud Build (slower)
 *   npm run deploy:prod         # Uses .env.production with local Docker build (fast)
 *   npm run deploy:prodNoDocker # Uses .env.production with Cloud Build (slower)
 *
 * Manual usage:
 *   node scripts/deploy-to-cloud-run.js [env-file] [--docker|--cloud-build]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = "biomasters-tcg";
const SERVICE_NAME = "biomasters-api";
const REGION = "us-east1";
const IMAGE_NAME = `gcr.io/${PROJECT_ID}/${SERVICE_NAME}`;

// Parse command line arguments
const envFile = process.argv[2] || '.env';
const buildMethod = process.argv[3] || '--docker';
const useDocker = buildMethod === '--docker';
const envPath = path.join(__dirname, '..', envFile);

console.log(`🚀 Deploying BioMasters TCG API to Cloud Run...`);
console.log(`📍 Project: ${PROJECT_ID}`);
console.log(`📍 Service: ${SERVICE_NAME}`);
console.log(`📍 Region: ${REGION}`);
console.log(`📍 Environment file: ${envFile}`);
console.log(`📍 Build method: ${useDocker ? 'Local Docker (fast)' : 'Cloud Build (slower)'}`);

// Check if environment file exists
if (!fs.existsSync(envPath)) {
    console.error(`❌ Environment file not found: ${envPath}`);
    process.exit(1);
}

// Parse environment file
function parseEnvFile(filePath) {
    const envVars = {};
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let i = 0;
    while (i < lines.length) {
        let line = lines[i].trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('#')) {
            i++;
            continue;
        }

        // Parse KEY=VALUE pairs
        const equalIndex = line.indexOf('=');
        if (equalIndex === -1) {
            i++;
            continue;
        }

        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();

        // Handle multi-line values (quoted strings that span multiple lines)
        if (value.startsWith('"') && !value.endsWith('"')) {
            // Multi-line quoted value - collect until closing quote
            value = value.substring(1); // Remove opening quote for processing
            i++;

            while (i < lines.length) {
                const nextLine = lines[i];
                if (nextLine.trim().endsWith('"')) {
                    // Found closing quote
                    value += '\n' + nextLine.substring(0, nextLine.lastIndexOf('"'));
                    break;
                } else {
                    value += '\n' + nextLine;
                }
                i++;
            }
        } else {
            // Single line value - remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
        }

        envVars[key] = value;
        i++;
    }

    return envVars;
}

// Load environment variables
const envVars = parseEnvFile(envPath);
console.log(`📋 Loaded ${Object.keys(envVars).length} environment variables`);

// Prepare environment variables for Cloud Run
const cloudRunEnvVars = [];

Object.entries(envVars).forEach(([key, value]) => {
    // Skip PORT as it's reserved by Cloud Run
    if (key === 'PORT') {
        return;
    }

    // Override specific values for production Cloud Run environment if needed
    if (key === 'NODE_ENV') {
        value = 'production';
    } else if (key === 'REDIS_HOST' && value === 'localhost') {
        value = '10.36.239.107'; // Direct Memorystore IP for Cloud Run
    } else if (key === 'REDIS_PORT' && value === '6379') {
        value = '6378'; // Direct Memorystore port for Cloud Run
    }

    // Pass values exactly as they are
    cloudRunEnvVars.push(`${key}=${value}`);
});

console.log(`🔧 Prepared ${cloudRunEnvVars.length} environment variables for Cloud Run`);

try {
    // Set the project
    console.log('🔧 Setting project...');
    execSync(`gcloud config set project ${PROJECT_ID}`, { stdio: 'inherit' });

    // Build and push the container image
    if (useDocker) {
        console.log('🔨 Building container image locally with Docker...');

        // Configure Docker for GCR authentication
        console.log('🔐 Configuring Docker authentication...');
        execSync('gcloud auth configure-docker --quiet', { stdio: 'inherit' });

        // Build Docker image locally
        console.log('🏗️ Building Docker image...');
        execSync(`docker build -t ${IMAGE_NAME} -f packages/server/Dockerfile .`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '../../..')  // Run from repo root
        });

        // Push to Google Container Registry
        console.log('📤 Pushing image to registry...');
        execSync(`docker push ${IMAGE_NAME}`, { stdio: 'inherit' });

    } else {
        console.log('🔨 Building container image with Cloud Build...');
        execSync(`gcloud builds submit --config packages/server/cloudbuild.yaml`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '../../..')  // Run from repo root
        });
    }

    // Deploy to Cloud Run
    console.log('🚀 Deploying to Cloud Run...');

    // Check if any environment variable values contain commas
    const hasCommas = cloudRunEnvVars.some(envVar => envVar.includes(','));

    // Use gcloud delimiter escaping if commas are present
    const envVarsArg = hasCommas ?
        `"^|||^${cloudRunEnvVars.join('|||')}"` :
        cloudRunEnvVars.join(',');

    const deployCmd = [
        'gcloud run deploy', SERVICE_NAME,
        '--image', IMAGE_NAME,
        '--platform managed',
        '--region', REGION,
        '--allow-unauthenticated',
        '--port 3001',
        '--memory 1Gi',
        '--cpu 1',
        '--min-instances 0',
        '--max-instances 1',
        '--vpc-connector', `projects/${PROJECT_ID}/locations/${REGION}/connectors/redis-connector`,
        '--vpc-egress private-ranges-only',
        '--set-env-vars', envVarsArg
    ].join(' ');

    console.log('🚀 Executing deployment...');
    execSync(deployCmd, { stdio: 'inherit' });

    console.log('✅ Deployment complete!');
    console.log(`🌐 Your API is now available at: https://${SERVICE_NAME}-416250257146.${REGION}.run.app`);
    console.log(`🏗️ Build method used: ${useDocker ? 'Local Docker (fast)' : 'Cloud Build (slower)'}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Test the health endpoint:');
    console.log(`   curl https://${SERVICE_NAME}-416250257146.${REGION}.run.app/health`);
    console.log('2. Update your frontend VITE_API_BASE_URL to point to the Cloud Run URL');
    console.log('3. Monitor logs with:');
    console.log(`   gcloud run services logs read ${SERVICE_NAME} --region ${REGION}`);

} catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
}
