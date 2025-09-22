import React, { useState, useEffect, useRef } from 'react';
import { IonProgressBar, IonText } from '@ionic/react';
import './TurnTimer.css';

interface TurnTimerProps {
  isActive: boolean;
  duration: number; // Duration in seconds (default: 60)
  onTimeUp: () => void;
  playerName?: string;
  actionsRemaining?: number;
}

const TurnTimer: React.FC<TurnTimerProps> = ({
  isActive,
  duration = 60,
  onTimeUp,
  playerName = 'Player',
  actionsRemaining = 0
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);

  // Reset timer when it becomes active
  useEffect(() => {
    if (isActive) {
      setTimeRemaining(duration);
      setIsWarning(false);
      console.log(`⏰ [TURN TIMER] Timer started for ${playerName} - ${duration} seconds`);
    }
  }, [isActive, duration, playerName]);

  // Component cleanup tracking
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (!isActive || timeRemaining <= 0 || !mountedRef.current) return;

    const timer = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(timer);
        return;
      }

      setTimeRemaining(prev => {
        const newTime = prev - 1;

        // Warning when 15 seconds or less
        if (newTime <= 15 && !isWarning && mountedRef.current) {
          setIsWarning(true);
          console.log(`⚠️ [TURN TIMER] Warning: ${newTime} seconds remaining for ${playerName}`);
        }

        // Time's up
        if (newTime <= 0 && mountedRef.current) {
          console.log(`⏰ [TURN TIMER] Time's up for ${playerName}!`);
          onTimeUp();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeRemaining, isWarning, onTimeUp, playerName]);

  // Don't render if not active
  if (!isActive) return null;

  const progress = timeRemaining / duration;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className={`turn-timer ${isWarning ? 'warning' : ''}`}>
      <div className="timer-header">
        <IonText color={isWarning ? 'danger' : 'primary'}>
          <h3>{playerName}'s Turn</h3>
        </IonText>
        <div className="timer-info">
          <span className="time-display">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          {actionsRemaining > 0 && (
            <span className="actions-remaining">
              {actionsRemaining} action{actionsRemaining !== 1 ? 's' : ''} left
            </span>
          )}
        </div>
      </div>
      
      <IonProgressBar 
        value={progress}
        color={isWarning ? 'danger' : 'primary'}
        className="timer-progress"
      />
      
      {isWarning && (
        <IonText color="danger" className="warning-text">
          <small>Time running out!</small>
        </IonText>
      )}
    </div>
  );
};

export default TurnTimer;
