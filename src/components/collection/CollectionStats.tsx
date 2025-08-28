/**
 * Collection Statistics Component
 * Shows collection progress and stats
 */

import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonProgressBar, IonText, IonGrid, IonRow, IonCol, IonIcon } from '@ionic/react';
import { trophy, library, card, statsChart } from 'ionicons/icons';

interface CollectionStatsProps {
  stats: {
    totalSpecies: number;
    ownedSpecies: number;
    totalCards: number;
    completionPercentage: number;
  };
}

export const CollectionStats: React.FC<CollectionStatsProps> = ({ stats }) => {
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
                  <small>Species</small>
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
                  <small>Total Cards</small>
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
                  <small>Complete</small>
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
              {stats.completionPercentage < 25 && "Keep collecting to reach 25% completion!"}
              {stats.completionPercentage >= 25 && stats.completionPercentage < 50 && "Great progress! Halfway to 50%!"}
              {stats.completionPercentage >= 50 && stats.completionPercentage < 75 && "Amazing! You're over halfway there!"}
              {stats.completionPercentage >= 75 && stats.completionPercentage < 100 && "So close! Almost a complete collection!"}
              {stats.completionPercentage === 100 && "🎉 Perfect! You've collected every species!"}
            </small>
          </IonText>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default CollectionStats;
