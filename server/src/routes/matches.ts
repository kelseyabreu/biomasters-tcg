/**
 * Match Management Routes
 * Handles match history, forfeit, and match-related operations
 */

import { Router, Request, Response } from 'express';
import { sql } from 'kysely';
import { db } from '../database/kysely';
import { requireAuth } from '../middleware/auth';
import { ApiResponse } from '@shared/types';
import deckAccessService from '../services/deckAccessService';
import { getGlobalIo, initializeBioMastersGame } from '../websocket/gameSocket';

// Import utility functions for proper game state handling
function serializeGameStateForTransmission(gameState: any): any {
  if (!gameState) return gameState;

  console.log('🔄 [REST SERIALIZATION] Starting serialization for game state:', {
    hasGameState: !!gameState,
    hasGrid: !!gameState.grid,
    hasEngineState: !!gameState.engineState,
    hasEngineGrid: !!(gameState.engineState?.grid),
    gridType: gameState.grid ? gameState.grid.constructor.name : 'undefined',
    engineGridType: gameState.engineState?.grid ? gameState.engineState.grid.constructor.name : 'undefined'
  });

  const serialized = { ...gameState };

  // Convert Map objects to plain objects for transmission
  if (gameState.grid && gameState.grid instanceof Map) {
    console.log('🔄 [REST SERIALIZATION] Converting grid Map to object for transmission, entries:', gameState.grid.size);
    serialized.grid = Object.fromEntries(gameState.grid.entries());
    console.log('🔄 [REST SERIALIZATION] Grid converted, result keys:', Object.keys(serialized.grid));
  }

  // Handle engineState if it exists
  if (gameState.engineState && gameState.engineState.grid && gameState.engineState.grid instanceof Map) {
    console.log('🔄 [REST SERIALIZATION] Converting engineState grid Map to object for transmission, entries:', gameState.engineState.grid.size);
    serialized.engineState = {
      ...gameState.engineState,
      grid: Object.fromEntries(gameState.engineState.grid.entries())
    };
    console.log('🔄 [REST SERIALIZATION] EngineState grid converted, result keys:', Object.keys(serialized.engineState.grid));
  }

  console.log('🔄 [REST SERIALIZATION] Serialization complete');
  return serialized;
}

function filterGameStateForPlayer(gameState: any, requestingPlayerId: string): any {
  console.log('🔒 [REST PRIVACY FILTER] Starting filter for player:', requestingPlayerId, {
    hasGameState: !!gameState,
    hasEngineState: !!gameState?.engineState,
    hasEngineGrid: !!(gameState?.engineState?.grid),
    engineGridType: gameState?.engineState?.grid ? gameState.engineState.grid.constructor.name : 'undefined'
  });

  if (!gameState || !gameState.engineState) {
    console.log('🔒 [REST PRIVACY FILTER] No game state or engine state, returning as-is');
    return gameState;
  }

  const filtered = { ...gameState };

  // Filter engineState players to hide opponent card details
  if (gameState.engineState.players) {
    filtered.engineState = {
      ...gameState.engineState,
      players: gameState.engineState.players.map((player: any) => {
        if (player.id === requestingPlayerId) {
          // Current player: show all their cards
          console.log(`🔒 [REST PRIVACY] Showing full hand to current player ${requestingPlayerId}: ${player.hand?.length || 0} cards`);
          return player;
        } else {
          // Opponent: hide card details, show only counts and silhouettes
          console.log(`🔒 [REST PRIVACY] Hiding opponent cards for player ${player.id}: ${player.hand?.length || 0} cards → silhouettes only`);
          return {
            ...player,
            hand: player.hand ? player.hand.map(() => ({
              instanceId: 'hidden-card',
              cardId: 0,
              isHidden: true,
              cardType: 'HIDDEN'
            })) : [],
            // Keep deck count but hide actual cards
            deck: player.deck ? new Array(player.deck.length).fill({
              instanceId: 'hidden-deck-card',
              cardId: 0,
              isHidden: true,
              cardType: 'HIDDEN'
            }) : []
          };
        }
      })
    };
  }

  return filtered;
}

const router = Router();

/**
 * Get match history for authenticated user
 * GET /api/matches/history
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, gameMode } = req.query;
    const userId = req.user!.id;
    const offset = (Number(page) - 1) * Number(limit);

    console.log(`📚 Getting match history for user ${userId} (page: ${page}, limit: ${limit})`);

    let query = db
      .selectFrom('match_results as mr')
      .leftJoin('users as opponent', 'mr.opponent_user_id', 'opponent.id')
      .leftJoin('game_sessions as gs', 'mr.session_id', 'gs.id')
      .select([
        'mr.id',
        'mr.session_id',
        'mr.game_mode',
        'mr.result',
        'mr.rating_before',
        'mr.rating_after',
        'mr.rating_change',
        'mr.match_duration',
        'mr.created_at',
        'opponent.username as opponent_username',
        'opponent.display_name as opponent_display_name',
        'gs.status as session_status'
      ])
      .where('mr.player_user_id', '=', userId)
      .orderBy('mr.created_at', 'desc')
      .limit(Number(limit))
      .offset(offset);

    if (gameMode) {
      query = query.where('mr.game_mode', '=', gameMode as string);
    }

    const matches = await query.execute();

    // Get total count for pagination
    let countQuery = db
      .selectFrom('match_results')
      .select(db.fn.count('id').as('total'))
      .where('player_user_id', '=', userId);

    if (gameMode) {
      countQuery = countQuery.where('game_mode', '=', gameMode as string);
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    return res.json({
      status: 'success',
      success: true,
      data: {
        matches: matches.map(match => ({
          id: match.id,
          sessionId: match.session_id,
          gameMode: match.game_mode,
          result: match.result,
          ratingBefore: match.rating_before,
          ratingAfter: match.rating_after,
          ratingChange: match.rating_change,
          duration: match.match_duration,
          opponent: {
            username: match.opponent_username,
            displayName: match.opponent_display_name
          },
          createdAt: match.created_at,
          sessionStatus: match.session_status
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get match history error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get match history',
      data: null
    } as ApiResponse);
  }
});

/**
 * Forfeit an active match
 * POST /api/matches/:sessionId/forfeit
 */
router.post('/:sessionId/forfeit', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Session ID is required',
        data: null
      } as ApiResponse);
    }

    console.log(`🏳️ User ${userId} forfeiting match ${sessionId}`);

    // Get the game session
    const session = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Game session not found',
        data: null
      } as ApiResponse);
    }

    // Check if user is part of this session
    const players = session.players as any[];
    const userInSession = players.some(p => p.playerId === userId);

    if (!userInSession) {
      return res.status(403).json({
        status: 'error',
        success: false,
        error: 'You are not part of this game session',
        data: null
      } as ApiResponse);
    }

    // Check if game is still active
    if (session.status !== 'playing' && session.status !== 'waiting') {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Game is not active',
        data: null
      } as ApiResponse);
    }

    // Update game session to finished
    const gameState = session.game_state as any;
    const winnerId = players.find(p => p.playerId !== userId)?.playerId || null;
    
    gameState.gamePhase = 'completed';
    gameState.winner = winnerId;
    gameState.completedAt = new Date();
    gameState.forfeitedBy = userId;

    await db
      .updateTable('game_sessions')
      .set({
        status: 'finished',
        game_state: gameState,
        updated_at: new Date()
      })
      .where('id', '=', sessionId)
      .execute();

    // Create match results
    const matchDuration = Math.floor((Date.now() - new Date(session.created_at).getTime()) / 1000);
    const gameMode = session.game_mode || 'casual_1v1';

    for (const player of players) {
      const isWinner = player.playerId === winnerId;
      const result = isWinner ? 'win' : 'loss';
      const ratingChange = isWinner ? 16 : -16; // Standard forfeit rating change
      const oldRating = player.rating || 1000;
      const newRating = oldRating + ratingChange;

      // Insert match result
      await db
        .insertInto('match_results')
        .values({
          session_id: sessionId,
          player_user_id: player.playerId,
          opponent_user_id: players.find(p => p.playerId !== player.playerId)?.playerId || null,
          game_mode: gameMode,
          result,
          rating_before: oldRating,
          rating_after: newRating,
          rating_change: ratingChange,
          match_duration: matchDuration,
          created_at: new Date()
        })
        .execute();

      // Update user rating using SQL expressions
      await db
        .updateTable('users')
        .set({
          current_rating: newRating,
          peak_rating: db.fn('GREATEST', ['peak_rating', newRating]),
          games_played: sql`COALESCE(games_played, 0) + 1`,
          games_won: isWinner ? sql`COALESCE(games_won, 0) + 1` : sql`COALESCE(games_won, 0)`,
          updated_at: new Date()
        })
        .where('id', '=', player.playerId)
        .execute();
    }

    console.log(`✅ Match ${sessionId} forfeited by ${userId}, winner: ${winnerId}`);

    return res.json({
      status: 'success',
      success: true,
      data: {
        sessionId,
        forfeited: true,
        winner: winnerId,
        message: 'Match forfeited successfully'
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Forfeit match error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to forfeit match',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get available decks for deck selection
 * GET /api/matches/:sessionId/decks
 */
router.get('/:sessionId/decks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Session ID is required',
        data: null
      } as ApiResponse);
    }

    // Verify user is part of this session
    const session = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Game session not found',
        data: null
      } as ApiResponse);
    }

    const players = session.players as any[];
    const userInSession = players.some(p => p.playerId === userId);

    if (!userInSession) {
      return res.status(403).json({
        status: 'error',
        success: false,
        error: 'Access denied',
        data: null
      } as ApiResponse);
    }

    console.log(`🎴 [GET-DECKS] Getting decks for user: ${userId}, session: ${sessionId}`);

    // Use new deck access service to get personal + template decks
    const sessionDecks = await deckAccessService.getSessionDecks(userId);

    console.log(`🎴 [GET-DECKS] Personal decks: ${sessionDecks.personal_decks.length}`);
    console.log(`🎴 [GET-DECKS] Template decks: ${sessionDecks.template_decks.length}`);

    // Combine all available decks for the response
    const allDecks = [
      ...sessionDecks.personal_decks.map(deck => ({
        id: deck.id,
        name: deck.name,
        card_count: deck.card_count,
        source: deck.source,
        created_at: new Date() // Personal decks have real created_at, templates don't need it
      })),
      ...sessionDecks.template_decks.map(deck => ({
        id: deck.id,
        name: deck.name,
        card_count: deck.card_count,
        source: deck.source,
        created_at: new Date() // Template decks use current time for sorting
      }))
    ];

    // Deduplicate by ID (personal decks take priority over templates)
    const deckMap = new Map();
    allDecks.forEach(deck => {
      if (!deckMap.has(deck.id) || deck.source === 'personal') {
        deckMap.set(deck.id, deck);
      }
    });
    const deduplicatedDecks = Array.from(deckMap.values());

    console.log(`🎴 [GET-DECKS] Total available decks: ${allDecks.length}`);
    console.log(`🎴 [GET-DECKS] After deduplication: ${deduplicatedDecks.length}`);

    return res.json({
      status: 'success',
      success: true,
      data: {
        decks: deduplicatedDecks.map(deck => ({
          id: deck.id,
          name: deck.name,
          cardCount: Number(deck.card_count),
          source: deck.source,
          isValid: Number(deck.card_count) >= 20
        }))
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get available decks error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get available decks',
      data: null
    } as ApiResponse);
  }
});

/**
 * Select deck for match
 * POST /api/matches/:sessionId/select-deck
 */
router.post('/:sessionId/select-deck', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { deckId } = req.body;
    const userId = req.user!.id;

    if (!sessionId || !deckId) {
      console.log(`❌ [DECK-SELECT] Missing required parameters: sessionId=${sessionId}, deckId=${deckId}`);
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Session ID and deck ID are required',
        data: null
      } as ApiResponse);
    }

    console.log(`🎯 User ${userId} selecting deck ${deckId} for session ${sessionId}`);

    // Verify deck exists and user has access to it (personal deck or template deck)
    const deck = await db
      .selectFrom('decks')
      .select([
        'decks.id',
        'decks.name',
        'decks.user_id',
        'decks.deck_type',
        'decks.is_claimable'
      ])
      .where('decks.id', '=', deckId)
      .executeTakeFirst();

    if (!deck) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Deck not found',
        data: null
      } as ApiResponse);
    }

    // Check if user has access to this deck
    const isPersonalDeck = deck.user_id === userId;
    const isTemplateDeck = deck.is_claimable === true; // Template decks are claimable

    if (!isPersonalDeck && !isTemplateDeck) {
      return res.status(403).json({
        status: 'error',
        success: false,
        error: 'Access denied to this deck',
        data: null
      } as ApiResponse);
    }

    console.log(`🎯 Deck access check: personal=${isPersonalDeck}, template=${isTemplateDeck}, deckUserId=${deck.user_id}, currentUserId=${userId}, isClaimable=${deck.is_claimable}`);

    // Validate deck has enough cards - use deck_cards table (same as game loading logic)
    const deckCardsResult = await db
      .selectFrom('deck_cards')
      .select(db.fn.count('id').as('card_count'))
      .where('deck_id', '=', deckId)
      .executeTakeFirst();

    const cardCount = Number(deckCardsResult?.card_count || 0);

    console.log(`🔍 [DECK-SELECT] Deck validation: deckId=${deckId}, cardCount=${cardCount}, deckName=${deck.name}`);

    if (cardCount < 20) {
      console.log(`❌ [DECK-SELECT] Deck validation failed: cardCount=${cardCount}, deckId=${deckId}, deckName=${deck.name}`);
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Deck must have at least 20 cards',
        data: null
      } as ApiResponse);
    }

    // Get and update game session
    const session = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      console.log(`❌ [DECK-SELECT] Session not found: sessionId=${sessionId}`);
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Game session not found',
        data: null
      } as ApiResponse);
    }

    console.log(`🔍 [DECK-SELECT] Session found: sessionId=${sessionId}, hasGameState=${!!session.game_state}`);

    // Check if user is part of this session
    const gameState = session.game_state as any;
    const players = gameState.players || [];
    const playerIndex = players.findIndex((p: any) => p.playerId === userId || p.id === userId);

    if (playerIndex === -1) {
      console.log(`❌ [DECK-SELECT] User not in session: userId=${userId}, sessionId=${sessionId}, players=${JSON.stringify(players.map((p: any) => ({ id: p.id, playerId: p.playerId })))}`);
      return res.status(403).json({
        status: 'error',
        success: false,
        error: 'You are not part of this game session',
        data: null
      } as ApiResponse);
    }

    // Update player's deck selection
    players[playerIndex].selectedDeckId = deckId;
    players[playerIndex].hasDeckSelected = true;
    players[playerIndex].deckSelectedAt = new Date();

    console.log(`✅ Player ${userId} deck selection updated: ${deckId}`);

    // Check if all players have selected decks
    const allPlayersSelected = players.every((p: any) => p.hasDeckSelected === true);
    console.log(`🔍 Deck selection status: ${players.filter((p: any) => p.hasDeckSelected).length}/${players.length} players selected`);

    // Update game state
    gameState.players = players;

    if (allPlayersSelected) {
      console.log(`🎮 All players selected decks! Initializing game for session ${sessionId}`);

      try {
        // Initialize BioMasters game engine with selected decks
        await initializeBioMastersGame(sessionId, gameState, players);

        // Transition to playing phase
        gameState.gamePhase = 'playing';
        gameState.deckSelectionCompleted = true;
        gameState.deckSelectionCompletedAt = new Date();

        // Clear deck selection timer
        if (gameState.deckSelectionDeadline) {
          delete gameState.deckSelectionTimeRemaining;
          delete gameState.deckSelectionDeadline;
        }

        console.log(`✅ [REST API] Game engine initialized and transitioned to playing phase for session ${sessionId}`);
      } catch (error) {
        console.error(`❌ [REST API] Failed to initialize game engine for session ${sessionId}:`, error);
        // Continue without failing the request - the game can still be initialized later
      }
    }

    // Update database
    await db
      .updateTable('game_sessions')
      .set({
        game_state: gameState,
        updated_at: new Date()
      })
      .where('id', '=', sessionId)
      .execute();

    // Emit WebSocket events
    const io = getGlobalIo();
    if (io) {
      console.log('🔌 [REST API] Emitting deck selection update via WebSocket');

      // Broadcast deck selection update to all players in the session
      io.to(sessionId).emit('deck_selection_update', {
        type: 'deck_selection_update',
        sessionId,
        data: {
          playerId: userId,
          deckSelected: true,
          deckId,
          deckName: deck.name,
          allPlayersSelected,
          gamePhase: gameState.gamePhase,
          players: players.map((p: any) => ({
            id: p.playerId || p.id,
            name: p.name || p.username,
            hasDeckSelected: p.hasDeckSelected || false,
            selectedDeckId: p.selectedDeckId
          }))
        },
        timestamp: Date.now()
      });

      if (allPlayersSelected) {
        console.log('🔌 [REST API] All players selected - emitting game initialization');

        // Emit game initialization event
        io.to(sessionId).emit('game_initialized', {
          type: 'game_initialized',
          sessionId,
          data: {
            gameState: gameState,
            message: 'All decks selected! Game initialized.'
          },
          timestamp: Date.now()
        });

        // Also emit a general game state update (personalized for each player)
        const socketsInRoom = await io.in(sessionId).fetchSockets();
        console.log(`🔌 [REST API] Sending personalized game state to ${socketsInRoom.length} players`);

        for (const playerSocket of socketsInRoom) {
          const playerId = (playerSocket as any).userId || 'unknown';
          const filteredGameState = filterGameStateForPlayer(gameState, playerId);
          const serializedGameState = serializeGameStateForTransmission(filteredGameState);

          playerSocket.emit('game_state_update', {
            type: 'game_state_update',
            sessionId,
            data: {
              gameState: serializedGameState,
              message: 'Game state updated to playing phase'
            },
            timestamp: Date.now()
          });
        }

        console.log(`🔌 [REST API] Emitted personalized game state updates - gamePhase: ${gameState.gamePhase}`);
      }
    } else {
      console.warn('⚠️ [REST API] WebSocket server not available for deck selection events');
    }

    return res.json({
      status: 'success',
      success: true,
      data: {
        deckSelected: true,
        deckId,
        deckName: deck.name,
        allPlayersSelected,
        gamePhase: gameState.gamePhase,
        message: allPlayersSelected ? 'All players ready! Initializing game...' : 'Deck selected successfully'
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Select deck error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to select deck',
      data: null
    } as ApiResponse);
  }
});

/**
 * Get match details
 * GET /api/matches/:sessionId
 */
router.get('/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Session ID is required',
        data: null
      } as ApiResponse);
    }

    const session = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Game session not found',
        data: null
      } as ApiResponse);
    }

    // Check if user has access to this session
    const gameState = session.game_state as any;
    const players = gameState.players || [];
    const userInSession = players.some((p: any) => p.playerId === userId || p.id === userId);

    if (!userInSession) {
      return res.status(403).json({
        status: 'error',
        success: false,
        error: 'Access denied',
        data: null
      } as ApiResponse);
    }

    // Add deck selection timing if in setup phase
    if (gameState.gamePhase === 'setup' && gameState.deckSelectionDeadline) {
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.floor((gameState.deckSelectionDeadline - now) / 1000));
      gameState.deckSelectionTimeRemaining = timeRemaining;
    }

    // Get user details for proper player mapping
    const playerIds = players.map((p: any) => p.playerId || p.id);
    const userDetails = await db
      .selectFrom('users')
      .select(['id', 'username', 'display_name', 'firebase_uid'])
      .where('id', 'in', playerIds)
      .execute();

    console.log('🔍 [GET MATCH] User details for player mapping:', userDetails);

    // Create enhanced players array with Firebase UID mapping
    const enhancedPlayers = players.map((player: any) => {
      const userDetail = userDetails.find(u => u.id === (player.playerId || player.id));
      return {
        ...player,
        firebaseUid: userDetail?.firebase_uid,
        username: userDetail?.username || userDetail?.display_name || player.name,
        name: userDetail?.display_name || userDetail?.username || player.name
      };
    });

    console.log('🔍 [GET MATCH] Enhanced players with Firebase UIDs:', enhancedPlayers);

    return res.json({
      status: 'success',
      success: true,
      data: {
        sessionId: session.id,
        gameMode: session.game_mode,
        status: session.status,
        players: enhancedPlayers, // Use enhanced players with Firebase UID mapping
        gameState: gameState,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Get match details error:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to get match details',
      data: null
    } as ApiResponse);
  }
});

// Debug endpoint to check current game state
router.get('/:sessionId/debug', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Session ID is required'
      } as ApiResponse);
    }

    console.log(`🔍 [DEBUG] Checking game state for session: ${sessionId}`);

    const session = await db
      .selectFrom('game_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      return res.status(404).json({
        status: 'error',
        success: false,
        error: 'Session not found'
      } as ApiResponse);
    }

    console.log(`🔍 [DEBUG] Session status: ${session.status}`);
    console.log(`🔍 [DEBUG] Game state:`, session.game_state);

    return res.json({
      status: 'success',
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        gameState: session.game_state,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ [DEBUG] Error checking game state:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      error: 'Failed to check game state'
    } as ApiResponse);
  }
});

export default router;
