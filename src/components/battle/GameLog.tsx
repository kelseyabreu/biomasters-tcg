import React, { useState, useEffect, useRef } from 'react';
import { 
  IonCard, 
  IonCardContent, 
  IonCardHeader, 
  IonCardTitle, 
  IonButton, 
  IonIcon,
  IonText,
  IonBadge
} from '@ionic/react';
import { chevronUp, chevronDown, eyeOff, eye } from 'ionicons/icons';
import './GameLog.css';

export interface GameLogEntry {
  id: string;
  timestamp: number;
  turn: number;
  playerId: string;
  playerName: string;
  action: 'play_card' | 'pass_turn' | 'use_ability' | 'move_card' | 'game_start' | 'game_end';
  details: {
    cardName?: string;
    cardId?: string;
    position?: { x: number; y: number };
    abilityName?: string;
    targetPosition?: { x: number; y: number };
    reason?: string;
  };
}

interface GameLogProps {
  entries: GameLogEntry[];
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

const GameLog: React.FC<GameLogProps> = ({
  entries,
  isVisible = true,
  onToggleVisibility
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const logContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logContentRef.current && isExpanded) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [entries, isExpanded]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getActionIcon = (action: GameLogEntry['action']) => {
    switch (action) {
      case 'play_card': return '🃏';
      case 'pass_turn': return '⏭️';
      case 'use_ability': return '⚡';
      case 'move_card': return '🚶';
      case 'game_start': return '🎮';
      case 'game_end': return '🏁';
      default: return '📝';
    }
  };

  const getActionDescription = (entry: GameLogEntry) => {
    const { action, details, playerName } = entry;
    
    switch (action) {
      case 'play_card':
        return `${playerName} played ${details.cardName || 'a card'}${details.position ? ` at (${details.position.x}, ${details.position.y})` : ''}`;
      case 'pass_turn':
        return `${playerName} passed their turn${details.reason ? ` (${details.reason})` : ''}`;
      case 'use_ability':
        return `${playerName} used ${details.abilityName || 'an ability'}${details.targetPosition ? ` targeting (${details.targetPosition.x}, ${details.targetPosition.y})` : ''}`;
      case 'move_card':
        return `${playerName} moved ${details.cardName || 'a card'}${details.position && details.targetPosition ? ` from (${details.position.x}, ${details.position.y}) to (${details.targetPosition.x}, ${details.targetPosition.y})` : ''}`;
      case 'game_start':
        return 'Game started';
      case 'game_end':
        return `Game ended${details.reason ? ` - ${details.reason}` : ''}`;
      default:
        return `${playerName} performed an action`;
    }
  };

  // If not visible, show a small toggle button
  if (!isVisible) {
    return (
      <div className="game-log-toggle-button">
        <IonButton
          fill="solid"
          size="small"
          color="primary"
          onClick={onToggleVisibility}
          title="Show game log"
        >
          <IonIcon icon={eye} />
          Log
        </IonButton>
      </div>
    );
  }

  return (
    <div className={`game-log ${isMinimized ? 'minimized' : ''}`}>
      <IonCard className="game-log-card">
        <IonCardHeader className="game-log-header">
          <div className="header-content">
            <IonCardTitle>
              Game Log
              {entries.length > 0 && (
                <IonBadge color="primary" className="entry-count">
                  {entries.length}
                </IonBadge>
              )}
            </IonCardTitle>
            <div className="header-controls">
              {onToggleVisibility && (
                <IonButton 
                  fill="clear" 
                  size="small"
                  onClick={onToggleVisibility}
                  title="Hide log"
                >
                  <IonIcon icon={eyeOff} />
                </IonButton>
              )}
              <IonButton 
                fill="clear" 
                size="small"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <IonIcon icon={isMinimized ? chevronUp : chevronDown} />
              </IonButton>
            </div>
          </div>
        </IonCardHeader>
        
        {!isMinimized && (
          <IonCardContent className="game-log-content">
            <div className="log-controls">
              <IonButton 
                fill="outline" 
                size="small"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </IonButton>
            </div>
            
            <div 
              ref={logContentRef}
              className={`log-entries ${isExpanded ? 'expanded' : 'compact'}`}
            >
              {entries.length === 0 ? (
                <div className="no-entries">
                  <IonText color="medium">
                    <p>No actions yet. Game log will appear here.</p>
                  </IonText>
                </div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="log-entry">
                    <div className="entry-header">
                      <span className="action-icon">{getActionIcon(entry.action)}</span>
                      <span className="turn-number">Turn {entry.turn}</span>
                      <span className="timestamp">{formatTime(entry.timestamp)}</span>
                    </div>
                    <div className="entry-description">
                      {getActionDescription(entry)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </IonCardContent>
        )}
      </IonCard>
    </div>
  );
};

export default GameLog;
