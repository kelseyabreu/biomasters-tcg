/**
 * Check user cards via direct database query (using server's db connection)
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { db } from '../src/database/kysely';

async function checkUserCards() {
  try {
    console.log('🔍 Checking cards for kelseyabreu@hotmail.com...\n');

    // Get user ID
    const user = await db
      .selectFrom('users')
      .select(['id', 'email', 'eco_credits'])
      .where('email', '=', 'kelseyabreu@hotmail.com')
      .executeTakeFirst();

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('👤 User Info:');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Credits: ${user.eco_credits}`);
    console.log('');

    // Get user cards
    const cards = await db
      .selectFrom('user_cards')
      .selectAll()
      .where('user_id', '=', user.id)
      .orderBy('acquired_at', 'desc')
      .execute();

    console.log(`📦 Total Cards: ${cards.length}`);
    console.log(`📊 Total Quantity: ${cards.reduce((sum, card) => sum + card.quantity, 0)}`);
    console.log('');

    if (cards.length > 0) {
      console.log('🎴 Card Details:');
      console.log('─'.repeat(100));
      console.log('Card ID | Quantity | Acquisition Method | Acquired At');
      console.log('─'.repeat(100));
      
      for (const card of cards) {
        const acquiredDate = new Date(card.acquired_at).toLocaleString();
        console.log(`${String(card.card_id).padEnd(7)} | ${String(card.quantity).padEnd(8)} | ${String(card.acquisition_method).padEnd(18)} | ${acquiredDate}`);
      }
      console.log('─'.repeat(100));
    } else {
      console.log('❌ No cards found');
    }

    console.log('');

    // Get recent sync actions
    const syncActions = await db
      .selectFrom('sync_actions_log')
      .select(['id', 'action_type', 'status', 'conflict_reason', 'processed_at'])
      .where('user_id', '=', user.id)
      .orderBy('processed_at', 'desc')
      .limit(10)
      .execute();

    console.log(`📝 Recent Sync Actions (last 10):`);
    console.log('─'.repeat(100));
    console.log('Action Type       | Status  | Conflict Reason      | Processed At');
    console.log('─'.repeat(100));

    for (const action of syncActions) {
      const processedDate = new Date(action.processed_at).toLocaleString();
      const conflictReason = action.conflict_reason || 'none';
      console.log(`${String(action.action_type).padEnd(17)} | ${String(action.status).padEnd(7)} | ${String(conflictReason).padEnd(20)} | ${processedDate}`);
    }
    console.log('─'.repeat(100));

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserCards();

