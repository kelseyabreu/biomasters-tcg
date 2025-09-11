/**
 * Resume Game Prompt Component
 * Shows when a paused game is detected and allows user to resume or start new
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { gameStateManager } from '../../services/GameStateManager';

export interface ResumeGamePromptProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const ResumeGamePrompt: React.FC<ResumeGamePromptProps> = ({
  isVisible,
  onDismiss
}) => {
  const history = useHistory();
  const { pausedGameMetadata, resumePausedGame } = useHybridGameStore();

  if (!isVisible || !pausedGameMetadata) {
    return null;
  }

  const handleResumeGame = async () => {
    try {
      console.log('🎮 [ResumePrompt] Resuming game...');
      
      // Update store state
      resumePausedGame();
      
      // Navigate to battle screen
      history.push('/battle');
      
      // Dismiss the prompt
      onDismiss();
    } catch (error) {
      console.error('❌ [ResumePrompt] Failed to resume game:', error);
      // Could show an error toast here
    }
  };

  const handleStartNew = async () => {
    try {
      console.log('🗑️ [ResumePrompt] Starting new game, clearing saved state...');
      
      // Clear the saved game state
      await gameStateManager.clearActiveGame();
      
      // Dismiss the prompt
      onDismiss();
    } catch (error) {
      console.error('❌ [ResumePrompt] Failed to clear saved game:', error);
      // Still dismiss the prompt
      onDismiss();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--ion-background-color)',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        maxWidth: '90vw',
        width: '400px',
        textAlign: 'center'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0',
          color: 'var(--ion-color-primary)',
          fontSize: '1.5rem'
        }}>
          Resume Game?
        </h3>
        
        <p style={{ 
          margin: '0 0 12px 0',
          color: 'var(--ion-text-color)',
          lineHeight: '1.5'
        }}>
          You have a saved <strong>{pausedGameMetadata.gameMode}</strong> game from{' '}
          <strong>{new Date(pausedGameMetadata.savedAt).toLocaleString()}</strong>.
        </p>
        
        <p style={{ 
          margin: '0 0 24px 0',
          color: 'var(--ion-color-medium)',
          fontSize: '0.9rem'
        }}>
          Turn {pausedGameMetadata.turnNumber} • {pausedGameMetadata.playerCount} players
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          flexDirection: window.innerWidth < 400 ? 'column' : 'row'
        }}>
          <button 
            onClick={handleResumeGame}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'var(--ion-color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Resume Game
          </button>
          
          <button 
            onClick={handleStartNew}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'var(--ion-color-medium)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Start New
          </button>
        </div>
        
        <p style={{ 
          margin: '16px 0 0 0',
          color: 'var(--ion-color-medium)',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}>
          Starting a new game will permanently delete your saved progress.
        </p>
      </div>
    </div>
  );
};

export default ResumeGamePrompt;
