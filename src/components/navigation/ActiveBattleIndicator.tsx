import React from 'react';
import { IonButton, IonIcon, IonChip, IonLabel } from '@ionic/react';
import { gameController, arrowForward } from 'ionicons/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { useHistory, useLocation } from 'react-router-dom';
import './ActiveBattleIndicator.css';

export const ActiveBattleIndicator: React.FC = () => {
  const { activeBattle } = useHybridGameStore();
  const history = useHistory();
  const location = useLocation();

  const handleReturnToBattle = () => {
    console.log('🎮 Returning to active battle:', activeBattle);

    if (activeBattle.sessionId) {
      history.push(`/battle/${activeBattle.sessionId}`);
    } else {
      console.error('❌ No sessionId in active battle:', activeBattle);
      // Fallback to clearing the active battle if no sessionId
      useHybridGameStore.setState(() => ({
        activeBattle: {
          sessionId: null,
          gameMode: null,
          levelId: null,
          isActive: false
        }
      }));
    }
  };

  if (!activeBattle.isActive) {
    return null;
  }

  // Hide the indicator if user is already on the battle page for this session
  const currentPath = location.pathname;
  const expectedBattlePath = `/battle/${activeBattle.sessionId}`;
  if (currentPath === expectedBattlePath) {
    return null;
  }

  const getModeDisplayName = (mode: string | null) => {
    switch (mode) {
      case 'campaign': return 'Campaign';
      case 'online': return 'Online Match';
      case 'scenarios': return 'Special Scenario';
      case 'tutorial': return 'Tutorial';
      default: return 'Battle';
    }
  };

  const getModeColor = (mode: string | null) => {
    switch (mode) {
      case 'campaign': return 'primary';
      case 'online': return 'secondary';
      case 'scenarios': return 'tertiary';
      case 'tutorial': return 'success';
      default: return 'medium';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="active-battle-indicator"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="battle-info">
          <IonIcon icon={gameController} color="primary" />
          <div className="battle-details">
            <span className="battle-title">Active Battle</span>
            <IonChip color={getModeColor(activeBattle.gameMode)}>
              <IonLabel>{getModeDisplayName(activeBattle.gameMode)}</IonLabel>
            </IonChip>
          </div>
        </div>
        
        <IonButton
          fill="solid"
          color="primary"
          size="small"
          onClick={handleReturnToBattle}
        >
          Return
          <IonIcon icon={arrowForward} slot="end" />
        </IonButton>
      </motion.div>
    </AnimatePresence>
  );
};
