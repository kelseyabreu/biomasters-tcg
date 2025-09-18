import { io, Socket } from 'socket.io-client';
import { useHybridGameStore } from '../state/hybridGameStore';
import { PhyloGameAction } from '@shared/types';

// Use shared PhyloGameAction instead of local interface
type GameAction = PhyloGameAction;

interface GameUpdate {
  type: 'game_state_update' | 'player_joined' | 'player_left' | 'player_ready' | 'game_started' | 'game_ended' | 'turn_change' | 'action_result';
  sessionId: string;
  data: any;
  timestamp: number;
}

export class GameSocketService {
  private socket: Socket | null = null;
  private currentSessionId: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Initialize socket asynchronously
    this.initializeSocket().catch(error => {
      console.error('❌ [GameSocket] Failed to initialize socket:', error);
    });
  }

  private async initializeSocket() {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const gameStore = useHybridGameStore.getState();

    console.log('🔍 [GameSocket] Current game store state:', {
      isAuthenticated: gameStore.isAuthenticated,
      isGuestMode: gameStore.isGuestMode,
      hasFirebaseUser: !!gameStore.firebaseUser,
      hasGuestToken: !!gameStore.guestToken,
      userId: gameStore.userId
    });

    // Get authentication token (Firebase or guest)
    let authToken = null;

    if (gameStore.firebaseUser) {
      console.log('🔐 [GameSocket] Getting Firebase token for WebSocket...');
      try {
        authToken = await gameStore.firebaseUser.getIdToken();
        console.log('✅ [GameSocket] Firebase token obtained for WebSocket:', {
          tokenLength: authToken.length,
          tokenPrefix: authToken.substring(0, 50) + '...'
        });
      } catch (error) {
        console.error('❌ [GameSocket] Failed to get Firebase token:', error);
        return;
      }
    } else if (gameStore.guestToken) {
      console.log('🔐 [GameSocket] Using guest token for WebSocket...');
      authToken = gameStore.guestToken;
    } else {
      console.warn('⚠️ [GameSocket] No auth token available for socket connection');
      console.log('🔍 [GameSocket] Available auth options:', {
        firebaseUser: !!gameStore.firebaseUser,
        guestToken: !!gameStore.guestToken,
        isAuthenticated: gameStore.isAuthenticated,
        isGuestMode: gameStore.isGuestMode
      });
      return;
    }

    console.log('🔌 [GameSocket] Initializing WebSocket connection to:', serverUrl);
    this.socket = io(serverUrl, {
      auth: {
        token: authToken
      },
      autoConnect: false
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to game socket');
      this.emit('connected', {});
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game socket');
      this.emit('disconnected', {});
    });

    this.socket.on('error', (error: any) => {
      console.error('Game socket error:', error);
      this.emit('error', error);
    });

    // Game-specific events
    this.socket.on('game_state_update', (update: GameUpdate) => {
      this.emit('game_state_update', update);
    });

    this.socket.on('player_joined', (update: GameUpdate) => {
      this.emit('player_joined', update);
    });

    this.socket.on('player_left', (update: GameUpdate) => {
      this.emit('player_left', update);
    });

    this.socket.on('player_ready', (update: GameUpdate) => {
      this.emit('player_ready', update);
    });

    this.socket.on('player_disconnected', (update: GameUpdate) => {
      this.emit('player_disconnected', update);
    });

    // ============================================================================
    // ONLINE MULTIPLAYER EVENT HANDLERS
    // ============================================================================

    // Matchmaking events
    this.socket.on('match_found', (data: any) => {
      console.log('🎯 Match found:', data);
      this.emit('match_found', data);
    });

    this.socket.on('match_accepted', (data: any) => {
      console.log('✅ Match accepted:', data);
      this.emit('match_accepted', data);
    });

    this.socket.on('game_starting', (data: any) => {
      console.log('🎮 Game starting:', data);
      this.emit('game_starting', data);
    });

    this.socket.on('matchmaking_cancelled', (data: any) => {
      console.log('🚫 Matchmaking cancelled:', data);
      this.emit('matchmaking_cancelled', data);
    });

    this.socket.on('queue_status', (data: any) => {
      console.log('⏱️ Queue status update:', data);
      this.emit('queue_status', data);

      // Update queue time in store
      const gameStore = useHybridGameStore.getState();
      if (gameStore.online.matchmaking.isSearching) {
        gameStore.online.matchmaking.queueTime = data.queueTime || 0;
      }
    });

    // Rating events
    this.socket.on('rating_updated', (data: any) => {
      console.log('📈 Rating updated:', data);
      this.emit('rating_updated', data);

      const gameStore = useHybridGameStore.getState();
      if (data.ratingUpdate) {
        gameStore.updateRating(data.ratingUpdate);
      }
    });

    // Quest events
    this.socket.on('quest_progress_updated', (data: any) => {
      console.log('📋 Quest progress updated:', data);
      this.emit('quest_progress_updated', data);

      const gameStore = useHybridGameStore.getState();
      if (data.questType && data.progress) {
        gameStore.updateQuestProgress(data.questType, data.progress);
      }
    });

    this.socket.on('daily_quests_reset', (data: any) => {
      console.log('🔄 Daily quests reset:', data);
      this.emit('daily_quests_reset', data);

      const gameStore = useHybridGameStore.getState();
      gameStore.refreshDailyQuests();
    });

    this.socket.on('action_result', (update: GameUpdate) => {
      this.emit('action_result', update);
    });

    this.socket.on('turn_change', (update: GameUpdate) => {
      this.emit('turn_change', update);
    });

    this.socket.on('game_started', (update: GameUpdate) => {
      this.emit('game_started', update);
    });

    this.socket.on('game_ended', (update: GameUpdate) => {
      this.emit('game_ended', update);
    });

    // Spectator events
    this.socket.on('spectator_game_state', (update: GameUpdate) => {
      this.emit('spectator_game_state', update);
    });
  }

  async connect() {
    // Reinitialize socket if needed (e.g., after authentication)
    if (!this.socket) {
      console.log('🔄 [GameSocket] Socket not initialized, initializing...');
      await this.initializeSocket();
    }

    if (this.socket && !this.socket.connected) {
      console.log('🔌 [GameSocket] Connecting to WebSocket...');
      this.socket.connect();
    } else if (this.socket && this.socket.connected) {
      console.log('✅ [GameSocket] Already connected to WebSocket');
    } else {
      console.error('❌ [GameSocket] Failed to initialize socket for connection');
    }
  }

  disconnect() {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  joinSession(sessionId: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    this.currentSessionId = sessionId;
    this.socket.emit('join_session', sessionId);
  }

  leaveSession() {
    if (!this.socket || !this.socket.connected) {
      return;
    }

    this.socket.emit('leave_session');
    this.currentSessionId = null;
  }

  sendGameAction(action: GameAction) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    if (!this.currentSessionId) {
      console.error('Not in a game session');
      return;
    }

    this.socket.emit('game_action', { action });
  }

  setPlayerReady(ready: boolean) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    if (!this.currentSessionId) {
      console.error('Not in a game session');
      return;
    }

    this.socket.emit('player_ready', { ready });
  }

  spectateSession(sessionId: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('spectate_session', sessionId);
  }

  // ============================================================================
  // ONLINE MULTIPLAYER METHODS
  // ============================================================================

  /**
   * Join matchmaking queue
   */
  joinMatchmaking(gameMode: string, preferences?: any) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log(`🔍 Joining matchmaking for ${gameMode}`);
    this.socket.emit('join_matchmaking', {
      gameMode,
      preferences: preferences || {},
      timestamp: Date.now()
    });
  }

  /**
   * Cancel matchmaking
   */
  cancelMatchmaking() {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log('🚫 Cancelling matchmaking');
    this.socket.emit('cancel_matchmaking', {
      timestamp: Date.now()
    });
  }

  /**
   * Accept found match
   */
  acceptMatch(sessionId: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log(`✅ Accepting match: ${sessionId}`);
    this.socket.emit('accept_match', {
      sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Update quest progress
   */
  updateQuestProgress(questType: string, progress: any) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('quest_progress', {
      questType,
      progress,
      timestamp: Date.now()
    });
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.eventListeners.has(event)) {
      return;
    }

    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.set(event, []);
    }
  }

  private emit(event: string, data: any) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Cleanup
  destroy() {
    this.leaveSession();
    this.disconnect();
    this.eventListeners.clear();
    this.socket = null;
  }
}

// Singleton instance
let gameSocketInstance: GameSocketService | null = null;

export function getGameSocket(): GameSocketService {
  if (!gameSocketInstance) {
    gameSocketInstance = new GameSocketService();
  }
  return gameSocketInstance;
}

export function destroyGameSocket() {
  if (gameSocketInstance) {
    gameSocketInstance.destroy();
    gameSocketInstance = null;
  }
}

// React hook for using game socket
export function useGameSocket() {
  const socket = getGameSocket();
  
  return {
    socket,
    isConnected: socket.isConnected(),
    connect: () => socket.connect(),
    disconnect: () => socket.disconnect(),
    joinSession: (sessionId: string) => socket.joinSession(sessionId),
    leaveSession: () => socket.leaveSession(),
    sendGameAction: (action: GameAction) => socket.sendGameAction(action),
    setPlayerReady: (ready: boolean) => socket.setPlayerReady(ready),
    spectateSession: (sessionId: string) => socket.spectateSession(sessionId),
    on: (event: string, callback: Function) => socket.on(event, callback),
    off: (event: string, callback?: Function) => socket.off(event, callback)
  };
}
