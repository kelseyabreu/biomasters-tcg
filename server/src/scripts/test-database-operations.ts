/**
 * Test Database Operations
 * 
 * This script tests database operations including:
 * 1. Database connection
 * 2. Basic CRUD operations
 * 3. Data import from JSON
 * 4. Query validation
 */

import { db } from '../database/kysely';
import { gameDataManager } from '../services/GameDataManager';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

class DatabaseTest {
  private results: TestResult[] = [];

  private addResult(name: string, passed: boolean, details: string, error?: string) {
    const result: TestResult = { name, passed, details };
    if (error) result.error = error;
    this.results.push(result);
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${details}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  async testDatabaseConnection(): Promise<void> {
    console.log('\n🔌 Testing Database Connection...');
    
    try {
      // Test basic connection with a simple query
      await db.selectFrom('users').select('id').limit(1).execute();
      
      this.addResult(
        'Database Connection',
        true,
        'Successfully connected to PostgreSQL database'
      );

      // Test if we can query the cards table
      const cardCount = await db.selectFrom('cards').select(db.fn.count('id').as('count')).executeTakeFirst();
      
      this.addResult(
        'Cards Table Query',
        true,
        `Cards table accessible with ${cardCount?.count || 0} records`
      );

    } catch (error) {
      this.addResult(
        'Database Connection',
        false,
        'Failed to connect to database',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async testBasicCRUD(): Promise<void> {
    console.log('\n📝 Testing Basic CRUD Operations...');
    
    try {
      // Test INSERT - Create a test user with all required fields based on actual schema
      const testUser = await db.insertInto('users')
        .values({
          firebase_uid: 'test-user-' + Date.now(),
          username: 'testuser' + Date.now(),
          email: 'test@example.com',
          email_verified: false,
          eco_credits: 0,
          xp_points: 0,
          last_reward_claimed_at: null,
          is_active: true,
          is_banned: false,
          ban_reason: null,
          account_type: 'registered',
          guest_id: null,
          guest_secret_hash: null,
          is_guest: false,
          needs_registration: false,
          display_name: 'Test User',
          avatar_url: null,
          level: 1,
          experience: 0,
          title: null,
          gems: 0,
          coins: 0,
          dust: 0,
          games_played: 0,
          games_won: 0,
          cards_collected: 0,
          packs_opened: 0,
          bio: null,
          location: null,
          favorite_species: null,
          is_public_profile: true,
          email_notifications: true,
          push_notifications: false,
          preferences: null,
          last_login_at: null
        })
        .returning('id')
        .executeTakeFirst();

      this.addResult(
        'INSERT Operation',
        testUser !== undefined,
        `Created test user with ID: ${testUser?.id}`
      );

      if (testUser) {
        // Test UPDATE
        await db.updateTable('users')
          .set({ display_name: 'Updated Test User' })
          .where('id', '=', testUser.id)
          .execute();

        // Test SELECT
        const updatedUser = await db.selectFrom('users')
          .selectAll()
          .where('id', '=', testUser.id)
          .executeTakeFirst();

        this.addResult(
          'UPDATE/SELECT Operations',
          updatedUser?.display_name === 'Updated Test User',
          `Successfully updated and retrieved user: ${updatedUser?.display_name}`
        );

        // Test DELETE
        await db.deleteFrom('users')
          .where('id', '=', testUser.id)
          .execute();

        const deletedUser = await db.selectFrom('users')
          .selectAll()
          .where('id', '=', testUser.id)
          .executeTakeFirst();

        this.addResult(
          'DELETE Operation',
          deletedUser === undefined,
          'Successfully deleted test user'
        );
      }

    } catch (error) {
      this.addResult(
        'Basic CRUD Operations',
        false,
        'Failed to perform CRUD operations',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async testDataImport(): Promise<void> {
    console.log('\n📥 Testing Data Import from JSON...');
    
    try {
      // Load game data first
      if (!gameDataManager.isDataLoaded()) {
        await gameDataManager.loadGameData();
      }

      const cards = gameDataManager.getCards();
      const abilities = gameDataManager.getAbilities();

      this.addResult(
        'JSON Data Loading',
        cards.size > 0 && abilities.size > 0,
        `Loaded ${cards.size} cards and ${abilities.size} abilities from JSON`
      );

      // Test if we can insert a card into the database
      const testCard = cards.get(1); // Oak Tree
      if (testCard) {
        // Check if card already exists
        const existingCard = await db.selectFrom('cards')
          .selectAll()
          .where('id', '=', testCard.cardId)
          .executeTakeFirst();

        if (!existingCard) {
          // Insert the card
          await db.insertInto('cards')
            .values({
              id: testCard.cardId,
              card_name: testCard.commonName || 'Unknown',
              common_name: testCard.commonName,
              scientific_name: testCard.scientificName,
              trophic_level: testCard.trophicLevel,
              trophic_category_id: testCard.trophicCategory,
              cost: testCard.cost ? JSON.stringify(testCard.cost) : null,
              victory_points: testCard.victoryPoints || 0
            })
            .execute();

          this.addResult(
            'Card Import',
            true,
            `Successfully imported card: ${testCard.commonName}`
          );
        } else {
          this.addResult(
            'Card Import',
            true,
            `Card already exists in database: ${existingCard.card_name}`
          );
        }
      }

    } catch (error) {
      this.addResult(
        'Data Import',
        false,
        'Failed to import data from JSON',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async testQueryValidation(): Promise<void> {
    console.log('\n🔍 Testing Query Validation...');
    
    try {
      // Test complex query with joins
      const cardsWithKeywords = await db.selectFrom('cards as c')
        .leftJoin('card_keywords as ck', 'c.id', 'ck.card_id')
        .select(['c.id', 'c.card_name', 'c.trophic_level'])
        .limit(5)
        .execute();

      this.addResult(
        'Complex Query',
        Array.isArray(cardsWithKeywords),
        `Retrieved ${cardsWithKeywords.length} cards with keyword joins`
      );

      // Test aggregation query
      const trophicLevelCounts = await db.selectFrom('cards')
        .select(['trophic_level', db.fn.count('id').as('count')])
        .groupBy('trophic_level')
        .execute();

      this.addResult(
        'Aggregation Query',
        Array.isArray(trophicLevelCounts),
        `Grouped cards by trophic level: ${trophicLevelCounts.length} groups`
      );

    } catch (error) {
      this.addResult(
        'Query Validation',
        false,
        'Failed to execute validation queries',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Database Operations Test Suite...\n');
    
    await this.testDatabaseConnection();
    await this.testBasicCRUD();
    await this.testDataImport();
    await this.testQueryValidation();
    
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 DATABASE TEST SUMMARY');
    console.log('=========================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 ALL DATABASE OPERATIONS ARE WORKING!');
      console.log('The database layer is fully functional.');
    } else {
      console.log('\n⚠️  Some database tests failed.');
      console.log('Check database configuration and schema.');
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

// Run the tests
const tester = new DatabaseTest();
tester.runAllTests().catch(console.error);
