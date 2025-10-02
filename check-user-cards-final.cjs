const { Client } = require('pg');

async function checkUserCards() {
  const client = new Client({
    connectionString: 'postgresql://postgres:QZOlYJcxSYezlaeOGjOPPeZqDEWGhSDJ@shuttle.proxy.rlwy.net:27035/railway',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Get user by email
    const userResult = await client.query(
      `SELECT id, email, username, eco_credits, xp_points FROM users WHERE email = $1`,
      ['kelseyabreu@hotmail.com']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('👤 User:', {
      id: user.id,
      email: user.email,
      username: user.username,
      credits: user.eco_credits,
      xp: user.xp_points
    });
    console.log('');

    // Get user's cards
    const cardsResult = await client.query(
      `SELECT *
       FROM user_cards
       WHERE user_id = $1
       ORDER BY card_id`,
      [user.id]
    );

    console.log(`📊 Total cards: ${cardsResult.rows.length}`);
    console.log('');

    if (cardsResult.rows.length > 0) {
      console.log('📋 Card details:');
      cardsResult.rows.forEach(card => {
        console.log(`   Card ${card.card_id}: qty ${card.quantity}, acquired: ${card.acquired_at || card.first_acquired_at || 'unknown'}`);
      });
      console.log('');
    }

    // Get recent sync actions
    console.log('🔄 Recent sync actions (last 10):');
    const actionsResult = await client.query(
      `SELECT action_id, action_type, status, conflict_reason, processed_at
       FROM sync_actions_log
       WHERE user_id = $1
       ORDER BY processed_at DESC
       LIMIT 10`,
      [user.id]
    );

    actionsResult.rows.forEach((action, index) => {
      console.log(`${index + 1}. ${action.action_type} - ${action.status} ${action.conflict_reason ? `(${action.conflict_reason})` : ''} - ${action.processed_at}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

checkUserCards().catch(console.error);

