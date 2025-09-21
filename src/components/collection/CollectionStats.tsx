/**
 * Collection Statistics Component
 * Shows collection progress and stats
 */

import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonProgressBar, IonText, IonGrid, IonRow, IonCol, IonIcon } from '@ionic/react';
import { trophy, library, card, statsChart } from 'ionicons/icons';
import { useUILocalization } from '../../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

interface CollectionStatsProps {
  stats: {
    totalSpecies: number;
    ownedSpecies: number;
    totalCards: number;
    completionPercentage: number;
  };
}

export const CollectionStats: React.FC<CollectionStatsProps> = ({ stats }) => {
  const { getUIText } = useUILocalization();
  return (
    <IonCard className="collection-stats-card">
      <IonCardHeader>
        <IonCardTitle>Collection Progress</IonCardTitle>
      </IonCardHeader>
      
      <IonCardContent>
        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-header">
            <IonText>
              <h3>{stats.ownedSpecies} / {stats.totalSpecies} Species</h3>
            </IonText>
            <IonText color="primary">
              <strong>{stats.completionPercentage}%</strong>
            </IonText>
          </div>
          <IonProgressBar 
            value={stats.completionPercentage / 100} 
            color="primary"
            className="collection-progress"
          />
        </div>

        {/* Stats Grid */}
        <IonGrid className="stats-grid">
          <IonRow>
            <IonCol size="4" className="stat-item">
              <div className="stat-icon">
                <IonIcon icon={library} color="primary" />
              </div>
              <div className="stat-content">
                <IonText color="medium">
                  <small>{getUIText(UITextId.UI_SPECIES)}</small>
                </IonText>
                <IonText>
                  <h4>{stats.ownedSpecies}</h4>
                </IonText>
              </div>
            </IonCol>
            
            <IonCol size="4" className="stat-item">
              <div className="stat-icon">
                <IonIcon icon={card} color="success" />
              </div>
              <div className="stat-content">
                <IonText color="medium">
                  <small>{getUIText(UITextId.UI_TOTAL_CARDS)}</small>
                </IonText>
                <IonText>
                  <h4>{stats.totalCards}</h4>
                </IonText>
              </div>
            </IonCol>
            
            <IonCol size="4" className="stat-item">
              <div className="stat-icon">
                <IonIcon icon={trophy} color="warning" />
              </div>
              <div className="stat-content">
                <IonText color="medium">
                  <small>{getUIText(UITextId.UI_COMPLETE)}</small>
                </IonText>
                <IonText>
                  <h4>{stats.completionPercentage}%</h4>
                </IonText>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Completion Milestones */}
        <div className="milestones">
          <IonText color="medium">
            <small>
              {stats.completionPercentage < 25 && getUIText(UITextId.UI_KEEP_COLLECTING_25)}
              {stats.completionPercentage >= 25 && stats.completionPercentage < 50 && getUIText(UITextId.UI_GREAT_PROGRESS_50)}
              {stats.completionPercentage >= 50 && stats.completionPercentage < 75 && getUIText(UITextId.UI_AMAZING_HALFWAY)}
              {stats.completionPercentage >= 75 && stats.completionPercentage < 100 && getUIText(UITextId.UI_SO_CLOSE_COMPLETE)}
              {stats.completionPercentage === 100 && getUIText(UITextId.UI_PERFECT_COLLECTION)}
            </small>
          </IonText>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default CollectionStats;
