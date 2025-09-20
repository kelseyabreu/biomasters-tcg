# Google Cloud Pub/Sub Setup Guide

## Current Status
- ❌ Service account `biomasters-server-dev@biomasters-tcg.iam.gserviceaccount.com` lacks Pub/Sub permissions
- ✅ Service account key is properly configured
- ✅ Project ID is correct: `biomasters-tcg`

## Required Permissions

Your service account needs these Pub/Sub permissions:
- `pubsub.topics.list`
- `pubsub.topics.get`
- `pubsub.topics.create`
- `pubsub.subscriptions.list`
- `pubsub.subscriptions.get`
- `pubsub.subscriptions.create`
- `pubsub.messages.publish`
- `pubsub.messages.ack`

## Option 1: Google Cloud Console (Recommended)

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com
   - Select project: `biomasters-tcg`

2. **Navigate to IAM & Admin**
   - Left menu → IAM & Admin → IAM

3. **Find your service account**
   - Look for: `biomasters-server-dev@biomasters-tcg.iam.gserviceaccount.com`

4. **Add Pub/Sub permissions**
   - Click the pencil icon (Edit) next to your service account
   - Click "ADD ANOTHER ROLE"
   - Add one of these roles:
     - **`Pub/Sub Admin`** (full access - recommended for development)
     - **`Pub/Sub Editor`** (read/write access)
     - Or individual roles: `Pub/Sub Publisher`, `Pub/Sub Subscriber`, `Pub/Sub Viewer`

5. **Save changes**

## Option 2: Google Cloud CLI Commands

If you have gcloud CLI installed:

```bash
# Set your project
gcloud config set project biomasters-tcg

# Add Pub/Sub Admin role to your service account
gcloud projects add-iam-policy-binding biomasters-tcg \
    --member="serviceAccount:biomasters-server-dev@biomasters-tcg.iam.gserviceaccount.com" \
    --role="roles/pubsub.admin"

# Verify the permissions
gcloud projects get-iam-policy biomasters-tcg \
    --flatten="bindings[].members" \
    --format="table(bindings.role)" \
    --filter="bindings.members:biomasters-server-dev@biomasters-tcg.iam.gserviceaccount.com"
```

## Option 3: Create Topics and Subscriptions Manually

If you prefer to create the resources manually in the console:

### Topics to Create:
1. `matchmaking-requests`
2. `match-found`
3. `match-cancelled`
4. `match-timeout`

### Subscriptions to Create:
1. `matchmaking-worker` (subscribes to `matchmaking-requests`)
2. `match-notifications` (subscribes to `match-found`)
3. `match-cancellations` (subscribes to `match-cancelled`)

### Steps:
1. Go to: https://console.cloud.google.com/cloudpubsub/topic/list
2. Click "CREATE TOPIC" for each topic above
3. For each topic, click on it and create the corresponding subscription

## Testing After Setup

Once permissions are added, run this command to test:

```bash
npm run test:pubsub
```

Or manually run:
```bash
npx tsx src/scripts/check-pubsub.ts
```

## Expected Output After Setup

You should see:
```
✅ Found X topics:
  📢 projects/biomasters-tcg/topics/matchmaking-requests
  📢 projects/biomasters-tcg/topics/match-found
  📢 projects/biomasters-tcg/topics/match-cancelled
  📢 projects/biomasters-tcg/topics/match-timeout

✅ Found X subscriptions:
  📬 projects/biomasters-tcg/subscriptions/matchmaking-worker
  📬 projects/biomasters-tcg/subscriptions/match-notifications
  📬 projects/biomasters-tcg/subscriptions/match-cancellations
```

## Troubleshooting

### Permission Denied Error
- Verify service account has correct roles
- Check that the key file path is correct
- Ensure project ID matches

### Authentication Error
- Verify the service account key is valid
- Check that the key file is readable
- Ensure GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_KEY_FILE are set correctly

### Resource Not Found
- Topics and subscriptions may need to be created manually
- Check that you're in the correct project
- Verify topic/subscription names match exactly
