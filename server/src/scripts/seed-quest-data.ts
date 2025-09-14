/**
 * Seed Quest Data Script
 * Populates the daily_quest_definitions table with default quests
 */

import { db } from '../database/kysely';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface QuestDefinition {
  quest_type: string;
  name: string;
  description: string;
  requirements: object;
  rewards: object;
  is_active: boolean;
  sort_order: number;
}

const defaultQuests: QuestDefinition[] = [
  {
    quest_type: 'play_games',
    name: 'Daily Player',
    description: 'Play 3 games today',
    requirements: { count: 3 },
    rewards: { eco_credits: 50, xp_points: 25 },
    is_active: true,
    sort_order: 1
  },
  {
    quest_type: 'win_matches',
    name: 'Victory Seeker',
    description: 'Win 2 matches today',
    requirements: { count: 2 },
    rewards: { eco_credits: 100, xp_points: 50 },
    is_active: true,
    sort_order: 2
  },
  {
    quest_type: 'play_ranked',
    name: 'Ranked Warrior',
    description: 'Play 1 ranked match today',
    requirements: { count: 1 },
    rewards: { eco_credits: 75, xp_points: 40 },
    is_active: true,
    sort_order: 3
  },
  {
    quest_type: 'complete_daily_streak',
    name: 'Streak Master',
    description: 'Complete all daily quests',
    requirements: { all_quests_completed: true },
    rewards: { eco_credits: 200, xp_points: 100 },
    is_active: true,
    sort_order: 4
  },
  {
    quest_type: 'play_different_modes',
    name: 'Mode Explorer',
    description: 'Play 2 different game modes today',
    requirements: { unique_modes: 2 },
    rewards: { eco_credits: 80, xp_points: 35 },
    is_active: true,
    sort_order: 5
  },
  {
    quest_type: 'win_streak',
    name: 'Unstoppable',
    description: 'Win 3 games in a row',
    requirements: { consecutive_wins: 3 },
    rewards: { eco_credits: 150, xp_points: 75 },
    is_active: true,
    sort_order: 6
  }
];

async function seedQuestData() {
  try {
    console.log('🌱 Starting quest data seeding...');

    // Clear existing quest definitions first
    console.log('🗑️ Clearing existing quest definitions...');
    await db.deleteFrom('daily_quest_definitions').execute();
    console.log('✅ Cleared existing quest definitions');

    const newQuests = defaultQuests;

    console.log(`📋 Inserting ${newQuests.length} new quest definitions...`);

    // Insert new quest definitions
    await db
      .insertInto('daily_quest_definitions')
      .values(newQuests.map(quest => ({
        ...quest,
        created_at: new Date(),
        updated_at: new Date()
      })))
      .execute();

    console.log('✅ Quest data seeding completed successfully');
    
    // Display seeded quests
    console.log('\n📋 Seeded Quest Definitions:');
    newQuests.forEach(quest => {
      console.log(`  • ${quest.name}: ${quest.description}`);
    });

  } catch (error) {
    console.error('❌ Quest data seeding failed:', error);
    throw error;
  }
}

/**
 * Run seeding if this script is executed directly
 */
async function runSeeding() {
  try {
    await seedQuestData();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  runSeeding();
}

export { seedQuestData };
