/**
 * Google Cloud Pub/Sub Checker
 * Lists all available topics and subscriptions
 */

import { PubSub } from '@google-cloud/pubsub';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkPubSubResources() {
  try {
    console.log('🔍 Checking Google Cloud Pub/Sub resources...');
    console.log(`📍 Project ID: ${process.env['GOOGLE_CLOUD_PROJECT_ID']}`);
    console.log(`🔑 Key File: ${process.env['GOOGLE_CLOUD_KEY_FILE']}`);
    
    // Initialize Pub/Sub client
    const pubsub = new PubSub({
      projectId: process.env['GOOGLE_CLOUD_PROJECT_ID']!,
      keyFilename: process.env['GOOGLE_CLOUD_KEY_FILE']!,
    });

    console.log('\n📋 Listing all topics...');
    const [topics] = await pubsub.getTopics();
    
    if (topics.length === 0) {
      console.log('❌ No topics found');
    } else {
      console.log(`✅ Found ${topics.length} topics:`);
      for (const topic of topics) {
        console.log(`  📢 ${topic.name}`);
        
        // Check subscriptions for this topic
        try {
          const [subscriptions] = await topic.getSubscriptions();
          if (subscriptions.length > 0) {
            console.log(`    📬 Subscriptions (${subscriptions.length}):`);
            for (const subscription of subscriptions) {
              console.log(`      - ${subscription.name}`);
            }
          } else {
            console.log(`    📭 No subscriptions`);
          }
        } catch (error) {
          console.log(`    ❌ Error getting subscriptions: ${error}`);
        }
      }
    }

    console.log('\n📋 Listing all subscriptions...');
    const [allSubscriptions] = await pubsub.getSubscriptions();
    
    if (allSubscriptions.length === 0) {
      console.log('❌ No subscriptions found');
    } else {
      console.log(`✅ Found ${allSubscriptions.length} subscriptions:`);
      for (const subscription of allSubscriptions) {
        console.log(`  📬 ${subscription.name}`);
        
        // Get subscription details
        try {
          const [metadata] = await subscription.getMetadata();
          console.log(`    📍 Topic: ${metadata.topic}`);
          console.log(`    ⚙️  Ack Deadline: ${metadata.ackDeadlineSeconds}s`);
          console.log(`    📊 Message Retention: ${metadata.messageRetentionDuration || 'default'}`);
        } catch (error) {
          console.log(`    ❌ Error getting metadata: ${error}`);
        }
      }
    }

    // Check for our expected topics
    console.log('\n🎯 Checking for expected matchmaking topics...');
    const expectedTopics = [
      'matchmaking-requests',
      'match-found', 
      'match-cancelled',
      'match-timeout'
    ];

    for (const topicName of expectedTopics) {
      try {
        const topic = pubsub.topic(topicName);
        const [exists] = await topic.exists();
        
        if (exists) {
          console.log(`✅ Topic '${topicName}' exists`);
          
          // Check for subscriptions
          const [subscriptions] = await topic.getSubscriptions();
          if (subscriptions.length > 0) {
            console.log(`  📬 Subscriptions: ${subscriptions.map(s => s.name.split('/').pop()).join(', ')}`);
          } else {
            console.log(`  📭 No subscriptions`);
          }
        } else {
          console.log(`❌ Topic '${topicName}' does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking topic '${topicName}': ${error}`);
      }
    }

    // Check for our expected subscriptions
    console.log('\n🎯 Checking for expected matchmaking subscriptions...');
    const expectedSubscriptions = [
      'matchmaking-worker',
      'match-notifications',
      'match-cancellations'
    ];

    for (const subscriptionName of expectedSubscriptions) {
      try {
        const subscription = pubsub.subscription(subscriptionName);
        const [exists] = await subscription.exists();
        
        if (exists) {
          console.log(`✅ Subscription '${subscriptionName}' exists`);
          
          // Get metadata
          const [metadata] = await subscription.getMetadata();
          console.log(`  📍 Topic: ${metadata.topic?.split('/').pop()}`);
        } else {
          console.log(`❌ Subscription '${subscriptionName}' does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking subscription '${subscriptionName}': ${error}`);
      }
    }

    console.log('\n✅ Pub/Sub resource check complete!');

  } catch (error) {
    console.error('❌ Failed to check Pub/Sub resources:', error);
    
    if ((error as any).code === 7) {
      console.error('🔐 Permission denied - check service account permissions');
    } else if ((error as any).code === 16) {
      console.error('🔑 Authentication failed - check service account key');
    }
  }
}

// Run the check
if (require.main === module) {
  checkPubSubResources();
}

export { checkPubSubResources };
