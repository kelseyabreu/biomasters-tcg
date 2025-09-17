/**
 * Google Cloud Pub/Sub Resource Setup
 * Creates all necessary topics and subscriptions for matchmaking
 */

import { PubSub } from '@google-cloud/pubsub';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupPubSubResources() {
  try {
    console.log('🚀 Setting up Google Cloud Pub/Sub resources...');
    console.log(`📍 Project ID: ${process.env['GOOGLE_CLOUD_PROJECT_ID']}`);

    // Initialize Pub/Sub client
    const pubsub = new PubSub({
      projectId: process.env['GOOGLE_CLOUD_PROJECT_ID']!,
      keyFilename: process.env['GOOGLE_CLOUD_KEY_FILE']!,
    });

    // Define topics and their subscriptions
    const topicsConfig = [
      {
        name: 'matchmaking-requests',
        subscriptions: ['matchmaking-worker']
      },
      {
        name: 'match-found',
        subscriptions: ['match-notifications']
      },
      {
        name: 'match-cancelled',
        subscriptions: ['match-cancellations']
      },
      {
        name: 'match-timeout',
        subscriptions: ['match-timeouts']
      }
    ];

    console.log('\n📢 Creating topics...');
    
    for (const topicConfig of topicsConfig) {
      const topic = pubsub.topic(topicConfig.name);
      
      try {
        const [exists] = await topic.exists();
        
        if (!exists) {
          await topic.create();
          console.log(`✅ Created topic: ${topicConfig.name}`);
        } else {
          console.log(`⏭️  Topic already exists: ${topicConfig.name}`);
        }

        // Create subscriptions for this topic
        console.log(`📬 Creating subscriptions for ${topicConfig.name}...`);
        
        for (const subscriptionName of topicConfig.subscriptions) {
          const subscription = topic.subscription(subscriptionName);
          
          try {
            const [subExists] = await subscription.exists();
            
            if (!subExists) {
              await subscription.create({
                ackDeadlineSeconds: 60,
                messageRetentionDuration: {
                  seconds: 7 * 24 * 60 * 60 // 7 days
                },
                enableMessageOrdering: false,
                retryPolicy: {
                  minimumBackoff: {
                    seconds: 10
                  },
                  maximumBackoff: {
                    seconds: 600
                  }
                }
              });
              console.log(`  ✅ Created subscription: ${subscriptionName}`);
            } else {
              console.log(`  ⏭️  Subscription already exists: ${subscriptionName}`);
            }
          } catch (error) {
            console.error(`  ❌ Failed to create subscription ${subscriptionName}:`, error);
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to create topic ${topicConfig.name}:`, error);
      }
    }

    console.log('\n🔍 Verifying setup...');
    
    // Verify all resources were created
    const [topics] = await pubsub.getTopics();
    const [subscriptions] = await pubsub.getSubscriptions();
    
    console.log(`✅ Total topics: ${topics.length}`);
    console.log(`✅ Total subscriptions: ${subscriptions.length}`);
    
    // Check each expected topic
    for (const topicConfig of topicsConfig) {
      const topicExists = topics.some(t => t.name.endsWith(`/${topicConfig.name}`));
      if (topicExists) {
        console.log(`✅ Verified topic: ${topicConfig.name}`);
        
        // Check subscriptions
        for (const subName of topicConfig.subscriptions) {
          const subExists = subscriptions.some(s => s.name.endsWith(`/${subName}`));
          if (subExists) {
            console.log(`  ✅ Verified subscription: ${subName}`);
          } else {
            console.log(`  ❌ Missing subscription: ${subName}`);
          }
        }
      } else {
        console.log(`❌ Missing topic: ${topicConfig.name}`);
      }
    }

    console.log('\n🎉 Pub/Sub setup complete!');
    console.log('\n📋 Summary:');
    console.log('Topics created:');
    topicsConfig.forEach(t => console.log(`  📢 ${t.name}`));
    console.log('Subscriptions created:');
    topicsConfig.forEach(t => t.subscriptions.forEach(s => console.log(`  📬 ${s} → ${t.name}`)));

  } catch (error) {
    console.error('❌ Failed to setup Pub/Sub resources:', error);
    
    if ((error as any).code === 7) {
      console.error('\n🔐 Permission denied! Please ensure your service account has these roles:');
      console.error('  - Pub/Sub Admin (recommended)');
      console.error('  - OR Pub/Sub Editor');
      console.error('  - OR Pub/Sub Publisher + Pub/Sub Subscriber + Pub/Sub Viewer');
      console.error('\nSee setup-pubsub-permissions.md for detailed instructions.');
    } else if ((error as any).code === 16) {
      console.error('\n🔑 Authentication failed! Check your service account key file.');
    }
    
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupPubSubResources();
}

export { setupPubSubResources };
