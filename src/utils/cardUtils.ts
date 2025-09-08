import { TrophicRole } from '../types';
import { ConservationStatus } from '@shared/enums';

/**
 * Get color for trophic role
 */
export function getTrophicColor(trophicRole: TrophicRole): string {
  switch (trophicRole) {
    case TrophicRole.PRODUCER:
      return '#4CAF50'; // Green
    case TrophicRole.HERBIVORE:
      return '#8BC34A'; // Light Green
    case TrophicRole.CARNIVORE:
      return '#F44336'; // Red
    case TrophicRole.OMNIVORE:
      return '#9C27B0'; // Purple
    case TrophicRole.DETRITIVORE:
      return '#795548'; // Brown
    default:
      return '#757575'; // Grey
  }
}

/**
 * Get color for conservation status
 */
export function getConservationColor(status: ConservationStatus): string {
  switch (status) {
    case ConservationStatus.EXTINCT:
      return '#000000'; // Black
    case ConservationStatus.EXTINCT_IN_WILD:
      return '#424242'; // Dark Grey
    case ConservationStatus.CRITICALLY_ENDANGERED:
      return '#D32F2F'; // Dark Red
    case ConservationStatus.ENDANGERED:
      return '#F44336'; // Red
    case ConservationStatus.VULNERABLE:
      return '#FF9800'; // Orange
    case ConservationStatus.NEAR_THREATENED:
      return '#FFC107'; // Amber
    case ConservationStatus.LEAST_CONCERN:
      return '#4CAF50'; // Green
    case ConservationStatus.DATA_DEFICIENT:
      return '#9E9E9E'; // Grey
    case ConservationStatus.NOT_EVALUATED:
      return '#607D8B'; // Blue Grey
    default:
      return '#757575'; // Default Grey
  }
}

/**
 * Get conservation status emoji
 */
export function getConservationEmoji(status: ConservationStatus): string {
  switch (status) {
    case ConservationStatus.EXTINCT:
      return '💀';
    case ConservationStatus.EXTINCT_IN_WILD:
      return '🏛️';
    case ConservationStatus.CRITICALLY_ENDANGERED:
      return '🚨';
    case ConservationStatus.ENDANGERED:
      return '⚠️';
    case ConservationStatus.VULNERABLE:
      return '🟡';
    case ConservationStatus.NEAR_THREATENED:
      return '🟠';
    case ConservationStatus.LEAST_CONCERN:
      return '🟢';
    case ConservationStatus.DATA_DEFICIENT:
      return '❓';
    case ConservationStatus.NOT_EVALUATED:
      return '⚪';
    default:
      return '❓';
  }
}

/**
 * Get trophic role emoji
 */
export function getTrophicEmoji(trophicRole: TrophicRole): string {
  switch (trophicRole) {
    case TrophicRole.PRODUCER:
      return '🌱';
    case TrophicRole.HERBIVORE:
      return '🐰';
    case TrophicRole.CARNIVORE:
      return '🐺';
    case TrophicRole.OMNIVORE:
      return '🐻';
    case TrophicRole.DETRITIVORE:
      return '🍄';
    default:
      return '🔄';
  }
}
