import { io, Socket } from 'socket.io-client';
import { useHybridGameStore } from '../state/hybridGameStore';

interface GameAction {
  type: 'place_card' | 'move_card' | 'challenge' | 'pass_turn';
  cardId?: string;
  position?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  challengeData?: {
    targetCardId: string;
    targetPlayerId: string;
    claimType: string;
    evidence: string;
  };
}

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
    this.initializeSocket();
  }

  private initializeSocket() {
    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    const gameStore = useHybridGameStore.getState();

    if (!gameStore.guestToken) {
      console.warn('No auth token available for socket connection');
      return;
    }

    this.socket = io(serverUrl, {
      auth: {
        token: gameStore.guestToken
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

  connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
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
