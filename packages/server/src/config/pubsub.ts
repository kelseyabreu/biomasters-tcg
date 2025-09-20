/**
 * Google Cloud Pub/Sub Configuration
 * Handles topic management and initialization for the matchmaking system
 */

import { PubSub, Topic, Subscription } from '@google-cloud/pubsub';

// Pub/Sub topic and subscription names
export const PUBSUB_TOPICS = {
  MATCHMAKING_REQUESTS: 'matchmaking-requests',
  MATCH_FOUND: 'match-found',
  MATCH_CANCELLED: 'match-cancelled',
  MATCH_TIMEOUT: 'match-timeout'
} as const;

export const PUBSUB_SUBSCRIPTIONS = {
  MATCHMAKING_WORKER: 'matchmaking-worker',
  MATCH_NOTIFICATIONS: 'match-notifications',
  MATCH_CANCELLATIONS: 'match-cancellations',
  MATCH_TIMEOUTS: 'match-timeouts'
} as const;

// Initialize Pub/Sub client with proper configuration
export const pubsub = new PubSub({
  projectId: process.env['GOOGLE_CLOUD_PROJECT_ID']!,
  // Use the same Firebase service account credentials
  credentials: {
    client_email: process.env['FIREBASE_CLIENT_EMAIL']!,
    private_key: process.env['FIREBASE_PRIVATE_KEY']!.replace(/\\n/g, '\n'),
    project_id: process.env['FIREBASE_PROJECT_ID']!,
  },
});

/**
 * Initialize all required Pub/Sub topics and subscriptions
 */
export async function initializePubSub(): Promise<void> {
  console.log('🔧 Initializing Google Cloud Pub/Sub...');

  try {
    // Create topics
    await createTopics();

    // Create subscriptions
    await createSubscriptions();

    console.log('✅ Pub/Sub initialization completed successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Pub/Sub:', error);
    throw error;
  }
}

/**
 * Create all required topics
 */
async function createTopics(): Promise<void> {
  const topicNames = Object.values(PUBSUB_TOPICS);

  for (const topicName of topicNames) {
    try {
      const topic = pubsub.topic(topicName);
      const [exists] = await topic.exists();

      if (!exists) {
        await pubsub.createTopic(topicName);
        console.log(`📢 Created topic: ${topicName}`);
      } else {
        console.log(`📢 Topic already exists: ${topicName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create topic ${topicName}:`, error);
      throw error;
    }
  }
}

/**
 * Create all required subscriptions
 */
async function createSubscriptions(): Promise<void> {
  const subscriptionConfigs = [
    {
      name: PUBSUB_SUBSCRIPTIONS.MATCHMAKING_WORKER,
      topic: PUBSUB_TOPICS.MATCHMAKING_REQUESTS,
      options: {
        ackDeadlineSeconds: 60,
        maxMessages: 10,
        allowExcessMessages: false
      }
    },
    {
      name: PUBSUB_SUBSCRIPTIONS.MATCH_NOTIFICATIONS,
      topic: PUBSUB_TOPICS.MATCH_FOUND,
      options: {
        ackDeadlineSeconds: 30,
        maxMessages: 100,
        allowExcessMessages: true
      }
    },
    {
      name: PUBSUB_SUBSCRIPTIONS.MATCH_CANCELLATIONS,
      topic: PUBSUB_TOPICS.MATCH_CANCELLED,
      options: {
        ackDeadlineSeconds: 30,
        maxMessages: 50,
        allowExcessMessages: true
      }
    },
    {
      name: PUBSUB_SUBSCRIPTIONS.MATCH_TIMEOUTS,
      topic: PUBSUB_TOPICS.MATCH_TIMEOUT,
      options: {
        ackDeadlineSeconds: 30,
        maxMessages: 50,
        allowExcessMessages: true
      }
    }
  ];

  for (const config of subscriptionConfigs) {
    try {
      const subscription = pubsub.subscription(config.name);
      const [exists] = await subscription.exists();

      if (!exists) {
        await pubsub.topic(config.topic).createSubscription(config.name, config.options);
        console.log(`📬 Created subscription: ${config.name} -> ${config.topic}`);
      } else {
        console.log(`📬 Subscription already exists: ${config.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create subscription ${config.name}:`, error);
      throw error;
    }
  }
}

/**
 * Get a topic instance
 */
export function getTopic(topicName: string): Topic {
  return pubsub.topic(topicName);
}

/**
 * Get a subscription instance
 */
export function getSubscription(subscriptionName: string): Subscription {
  return pubsub.subscription(subscriptionName);
}

/**
 * Publish a message to a topic with error handling
 */
export async function publishMessage(
  topicName: string,
  data: any,
  attributes?: Record<string, string>
): Promise<string> {
  try {
    console.log(`🔴 [PUBSUB] ===== PUBLISHING MESSAGE =====`);
    console.log(`🔴 [PUBSUB] Topic name: ${topicName}`);
    console.log(`🔴 [PUBSUB] Message data:`, JSON.stringify(data, null, 2));
    console.log(`🔴 [PUBSUB] Message attributes:`, JSON.stringify(attributes || {}, null, 2));

    const topic = getTopic(topicName);
    console.log(`🔴 [PUBSUB] Topic object:`, {
      name: topic.name,
      projectId: topic.pubsub.projectId
    });

    const messageBuffer = Buffer.from(JSON.stringify(data));
    console.log(`🔴 [PUBSUB] Message buffer size: ${messageBuffer.length} bytes`);

    console.log(`🔴 [PUBSUB] About to call topic.publishMessage()...`);
    const messageId = await topic.publishMessage({
      data: messageBuffer,
      attributes: attributes || {}
    });
    console.log(`🔴 [PUBSUB] topic.publishMessage() completed successfully`);

    console.log(`📤 Published message ${messageId} to topic ${topicName}`);
    return messageId;
  } catch (error: any) {
    console.error(`❌ [PUBSUB] Failed to publish message to topic ${topicName}:`, error);
    console.error(`❌ [PUBSUB] Error details:`, {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    throw error;
  }
}

/**
 * Health check for Pub/Sub connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Try to list topics to verify connection
    const [topics] = await pubsub.getTopics();
    console.log(`🔍 Pub/Sub health check: Found ${topics.length} topics`);
    return true;
  } catch (error) {
    console.error('❌ Pub/Sub health check failed:', error);
    return false;
  }
}