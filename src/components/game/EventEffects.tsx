import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { IonCard, IonCardContent, IonButton, IonIcon, IonProgressBar } from '@ionic/react';
import { 
  thunderstormOutline, 
  flameOutline, 
  leafOutline, 
  waterOutline, 
  snowOutline,
  warningOutline,
  shieldOutline,
  heartOutline
} from 'ionicons/icons';
import { EventCard, EventResult } from '../../game-logic/eventCards';
import './EventEffects.css';

interface EventEffectsProps {
  eventCard: EventCard | null;
  eventResult: EventResult | null;
  onReaction: (reactionType: string) => void;
  onEventComplete: () => void;
  reactionTimeRemaining?: number;
  isVisible: boolean;
}

export const EventEffects: React.FC<EventEffectsProps> = ({
  eventCard,
  eventResult,
  onReaction,
  onEventComplete,
  reactionTimeRemaining = 0,
  isVisible
}) => {
  const [showReactionOptions, setShowReactionOptions] = useState(false);
  const [cascadeAnimations, setCascadeAnimations] = useState<Array<{ id: string; effect: string }>>([]);
  const controls = useAnimation();

  useEffect(() => {
    if (eventResult && eventResult.cascadeEffects.length > 0) {
      // Trigger cascade animations
      const animations = eventResult.cascadeEffects.map((effect, index) => ({
        id: `cascade-${index}`,
        effect
      }));
      setCascadeAnimations(animations);

      // Clear animations after they complete
      setTimeout(() => setCascadeAnimations([]), 3000);
    }
  }, [eventResult]);

  useEffect(() => {
    if (isVisible && eventCard) {
      controls.start("visible");
      
      // Show reaction options if there are opportunities
      if (eventResult?.reactionOpportunities && eventResult.reactionOpportunities.length > 0) {
        setShowReactionOptions(true);
      }
    } else {
      controls.start("hidden");
      setShowReactionOptions(false);
    }
  }, [isVisible, eventCard, eventResult, controls]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'climate': return thunderstormOutline;
      case 'natural_disaster': return flameOutline;
      case 'environmental': return leafOutline;
      case 'human': return warningOutline;
      case 'conservation': return shieldOutline;
      default: return warningOutline;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'climate': return '#3b82f6';
      case 'natural_disaster': return '#ef4444';
      case 'environmental': return '#22c55e';
      case 'human': return '#f59e0b';
      case 'conservation': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const handleReaction = (reactionType: string) => {
    onReaction(reactionType);
    setShowReactionOptions(false);
  };

  if (!eventCard) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="event-effects-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background Effects */}
          <div className="event-background-effects">
            {eventCard.eventType === 'climate' && (
              <motion.div
                className="climate-effect"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1.5, rotate: 360 }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
            )}
            
            {eventCard.eventType === 'natural_disaster' && (
              <motion.div
                className="disaster-effect"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 2, opacity: 0.7 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            )}
          </div>

          {/* Main Event Card */}
          <motion.div
            className="event-card-container"
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              duration: 0.8 
            }}
          >
            <IonCard className={`event-card event-${eventCard.eventType}`}>
              <div 
                className="event-header"
                style={{ backgroundColor: getEventColor(eventCard.eventType) }}
              >
                <IonIcon 
                  icon={getEventIcon(eventCard.eventType)} 
                  className="event-icon"
                />
                <h2>{eventCard.name}</h2>
              </div>
              
              <IonCardContent>
                <div className="event-description">
                  <p>{eventCard.description}</p>
                  <div className="event-flavor">
                    <em>{eventCard.flavorText}</em>
                  </div>
                </div>

                {/* Event Results */}
                {eventResult && (
                  <motion.div
                    className="event-results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3>Environmental Impact</h3>
                    
                    {eventResult.cardsRemoved.length > 0 && (
                      <div className="impact-section removed">
                        <IonIcon icon={warningOutline} />
                        <span>{eventResult.cardsRemoved.length} species affected</span>
                      </div>
                    )}
                    
                    {eventResult.cardsMoved.length > 0 && (
                      <div className="impact-section moved">
                        <IonIcon icon={waterOutline} />
                        <span>{eventResult.cardsMoved.length} species migrated</span>
                      </div>
                    )}
                    
                    {eventResult.ecosystemDisruption.stabilityChange !== 0 && (
                      <div className={`impact-section ${eventResult.ecosystemDisruption.stabilityChange > 0 ? 'positive' : 'negative'}`}>
                        <IonIcon icon={eventResult.ecosystemDisruption.stabilityChange > 0 ? heartOutline : warningOutline} />
                        <span>
                          Ecosystem stability {eventResult.ecosystemDisruption.stabilityChange > 0 ? 'improved' : 'decreased'} 
                          by {Math.abs(eventResult.ecosystemDisruption.stabilityChange)}%
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Reaction Timer */}
                {showReactionOptions && reactionTimeRemaining > 0 && (
                  <motion.div
                    className="reaction-timer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="timer-label">Reaction Time Remaining</div>
                    <IonProgressBar 
                      value={reactionTimeRemaining / (eventCard.reactionWindow || 30000)}
                      color={reactionTimeRemaining < 10000 ? 'danger' : 'warning'}
                    />
                    <div className="timer-value">{Math.ceil(reactionTimeRemaining / 1000)}s</div>
                  </motion.div>
                )}

                {/* Reaction Options */}
                {showReactionOptions && eventResult?.reactionOpportunities && eventResult.reactionOpportunities.length > 0 && (
                  <motion.div
                    className="reaction-options"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <h3>Available Reactions</h3>
                    <div className="reaction-buttons">
                      {eventResult.reactionOpportunities[0]?.availableReactions?.map((reaction, index) => (
                        <motion.div
                          key={reaction}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                        >
                          <IonButton
                            fill="outline"
                            color={getReactionColor(reaction)}
                            onClick={() => handleReaction(reaction)}
                            className="reaction-button"
                          >
                            <IonIcon icon={getReactionIcon(reaction)} slot="start" />
                            {getReactionLabel(reaction)}
                          </IonButton>
                        </motion.div>
                      ))}
                      
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 }}
                      >
                        <IonButton
                          fill="clear"
                          color="medium"
                          onClick={() => setShowReactionOptions(false)}
                          className="reaction-button"
                        >
                          No Reaction
                        </IonButton>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Continue Button */}
                {!showReactionOptions && (
                  <motion.div
                    className="continue-section"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    <IonButton
                      expand="block"
                      color="primary"
                      onClick={onEventComplete}
                      className="continue-button"
                    >
                      Continue Game
                    </IonButton>
                  </motion.div>
                )}
              </IonCardContent>
            </IonCard>
          </motion.div>

          {/* Cascade Effect Animations */}
          <AnimatePresence>
            {cascadeAnimations.map((cascade) => (
              <motion.div
                key={cascade.id}
                className="cascade-effect"
                initial={{ scale: 0, opacity: 0, rotate: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1], 
                  opacity: [0, 0.8, 0], 
                  rotate: [0, 180, 360] 
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: `${Math.random() * 60 + 20}%`,
                  left: `${Math.random() * 60 + 20}%`,
                  pointerEvents: 'none'
                }}
              >
                <div className="cascade-text">{cascade.effect}</div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Particle Effects */}
          <div className="particle-effects">
            {Array.from({ length: 20 }, (_, i) => (
              <motion.div
                key={i}
                className={`particle particle-${eventCard.eventType}`}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 50,
                  opacity: 0,
                  scale: 0
                }}
                animate={{ 
                  y: -50,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: Math.random() * window.innerWidth
                }}
                transition={{ 
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 2,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper functions
const getReactionColor = (reaction: string): string => {
  switch (reaction.toLowerCase()) {
    case 'conservation': return 'success';
    case 'migration': return 'warning';
    case 'protection': return 'primary';
    case 'adaptation': return 'secondary';
    default: return 'medium';
  }
};

const getReactionIcon = (reaction: string) => {
  switch (reaction.toLowerCase()) {
    case 'conservation': return shieldOutline;
    case 'migration': return waterOutline;
    case 'protection': return heartOutline;
    case 'adaptation': return leafOutline;
    default: return warningOutline;
  }
};

const getReactionLabel = (reaction: string): string => {
  return reaction.charAt(0).toUpperCase() + reaction.slice(1);
};
