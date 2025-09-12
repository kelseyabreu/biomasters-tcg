/**
 * Client Game Types
 * Client-specific interfaces for UI compatibility
 * Extracted from ClientGameEngine.ts for preservation during cleanup
 */

import { GamePhase, TurnPhase } from '@shared/enums';

// Client-specific interfaces for UI compatibility
export interface ClientGameState {
  gameId: string;
  players: ClientPlayer[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  actionsRemaining: number;
  turnNumber: number;
  grid: Map<string, ClientGridCard>;
  gameSettings: ClientGameSettings;
  metadata: Record<string, any>;
  isOffline: boolean;
  lastSyncTimestamp?: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  hand: string[];
  deck: string[];
  scorePile: ClientGridCard[];
  energy: number;
  isReady: boolean;
}

export interface ClientGridCard {
  instanceId: string;
  cardId: number;
  ownerId: string;
  position: { x: number; y: number };
  isExhausted: boolean;
  attachments: ClientGridCard[];
  statusEffects: ClientStatusEffect[];
  isDetritus: boolean;
  isHOME: boolean;
}

export interface ClientStatusEffect {
  effectId: string;
  name: string;
  description: string;
  duration: number;
  stackable: boolean;
  metadata: Record<string, any>;
}

export interface ClientGameSettings {
  maxPlayers: number;
  gridWidth: number;
  gridHeight: number;
  startingHandSize: number;
  maxHandSize: number;
  startingEnergy?: number;
}

export interface ClientPlayCardPayload {
  cardId: string;
  position: { x: number; y: number };
}

export interface ClientActivateAbilityPayload {
  cardInstanceId: string;
  abilityId: number;
  targetPosition?: { x: number; y: number };
}
