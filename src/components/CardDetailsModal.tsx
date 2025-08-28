import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader
} from '@ionic/react';
import {
  close,
  flash,
  heart,
  speedometer,
  eye,
  thermometer,
  leaf,
  paw,
  skull,
  library,
  water
} from 'ionicons/icons';
import { Card as CardType, TrophicRole } from '../types';
import OrganismRenderer from './OrganismRenderer';
import './CardDetailsModal.css';

interface CardDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardType | null;
  onAddToDeck?: (card: CardType) => void;
  showAddToDeck?: boolean;
}

const CardDetailsModal: React.FC<CardDetailsModalProps> = ({
  isOpen,
  onClose,
  card,
  onAddToDeck,
  showAddToDeck = false
}) => {
  if (!card) return null;



  const getTrophicIcon = (role: TrophicRole) => {
    switch (role) {
      case TrophicRole.PRODUCER:
        return leaf;
      case TrophicRole.HERBIVORE:
        return paw;
      case TrophicRole.CARNIVORE:
        return flash;
      case TrophicRole.OMNIVORE:
        return heart;
      case TrophicRole.DETRITIVORE:
        return speedometer;
      case TrophicRole.DECOMPOSER:
        return skull;
      case TrophicRole.SCAVENGER:
        return eye;
      case TrophicRole.FILTER_FEEDER:
        return thermometer;
      case TrophicRole.MIXOTROPH:
        return library;
      default:
        return paw;
    }
  };

  const getTrophicColor = (role: TrophicRole) => {
    switch (role) {
      case TrophicRole.PRODUCER:
        return 'success';
      case TrophicRole.HERBIVORE:
        return 'warning';
      case TrophicRole.CARNIVORE:
        return 'danger';
      case TrophicRole.OMNIVORE:
        return 'tertiary';
      case TrophicRole.DETRITIVORE:
        return 'secondary';
      case TrophicRole.DECOMPOSER:
        return 'dark';
      case TrophicRole.SCAVENGER:
        return 'medium';
      case TrophicRole.FILTER_FEEDER:
        return 'primary';
      case TrophicRole.MIXOTROPH:
        return 'light';
      default:
        return 'medium';
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Clear any focused elements before closing
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  const handleModalDismiss = () => {
    // Clear any focused elements before closing
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleModalDismiss}
      canDismiss={true}
      backdropDismiss={true}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{card.commonName}</IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            onClick={handleClose}
          >
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="card-details-content">
        {/* Species Header */}
        <div className="species-header">
          <div className="species-illustration-large">
            <div className="organism-preview">
              <OrganismRenderer card={card} size={200} showControls={true} />
            </div>
          </div>
          
          <div className="species-info">
            <h1>{card.commonName}</h1>
            <h2>{card.scientificName}</h2>
            <div className="badges">
              <IonBadge color={getTrophicColor(card.trophicRole)}>
                <IonIcon icon={getTrophicIcon(card.trophicRole)} />
                {card.trophicRole}
              </IonBadge>
              <IonBadge color="medium">{card.habitat}</IonBadge>
              <IonBadge color="tertiary">{card.conservationStatus}</IonBadge>
            </div>
          </div>
        </div>





        {/* Game Stats */}
        <IonList>
          <IonListHeader>
            <IonIcon icon={flash} />
            <IonLabel>Game Statistics</IonLabel>
          </IonListHeader>
          
          <IonItem>
            <IonIcon icon={flash} slot="start" color="danger" />
            <IonLabel>
              <h3>Power</h3>
              <p>Combat strength and damage potential</p>
              <p><strong>Real data:</strong> {card.realData?.mass_kg}kg mass
              {card.realData?.run_Speed_m_per_hr && `, ${(card.realData.run_Speed_m_per_hr / 1000).toFixed(1)}km/hr max speed`}
              {card.realData?.vision_range_m && `, ${card.realData.vision_range_m}m vision range`}</p>
            </IonLabel>
            <IonBadge color="danger" slot="end">{card.power}</IonBadge>
          </IonItem>
          
          <IonItem>
            <IonIcon icon={heart} slot="start" color="success" />
            <IonLabel>
              <h3>Health</h3>
              <p>Survivability and endurance</p>
              <p><strong>Real data:</strong> {card.realData?.mass_kg}kg body mass
              {card.realData?.lifespan_Max_Days && `, ${Math.round(card.realData.lifespan_Max_Days / 365)} year lifespan`}
              {card.realData?.temperatureMinimum_C !== undefined && card.realData?.temperatureMaximum_C !== undefined &&
                `, survives ${card.realData.temperatureMinimum_C}°C to ${card.realData.temperatureMaximum_C}°C`}</p>
            </IonLabel>
            <IonBadge color="success" slot="end">{card.health}/{card.maxHealth}</IonBadge>
          </IonItem>
          
          <IonItem>
            <IonIcon icon={speedometer} slot="start" color="primary" />
            <IonLabel>
              <h3>Speed</h3>
              <p>Movement and reaction time</p>
              <p><strong>Real data:</strong>
              {card.realData?.walk_Speed_m_per_hr && `Walk: ${(card.realData.walk_Speed_m_per_hr / 1000).toFixed(1)}km/hr`}
              {card.realData?.run_Speed_m_per_hr && `, Run: ${(card.realData.run_Speed_m_per_hr / 1000).toFixed(1)}km/hr`}
              {card.realData?.swim_Speed_m_per_hr && card.realData.swim_Speed_m_per_hr > 0 && `, Swim: ${(card.realData.swim_Speed_m_per_hr / 1000).toFixed(1)}km/hr`}</p>
            </IonLabel>
            <IonBadge color="primary" slot="end">{card.speed}</IonBadge>
          </IonItem>
          
          <IonItem>
            <IonIcon icon={eye} slot="start" color="warning" />
            <IonLabel>
              <h3>Senses</h3>
              <p>Detection and awareness range</p>
              <p><strong>Real data:</strong>
              {card.realData?.vision_range_m && `Vision: ${card.realData.vision_range_m}m`}
              {card.realData?.hearing_range_m && `, Hearing: ${card.realData.hearing_range_m}m`}
              {card.realData?.smell_range_m && `, Smell: ${card.realData.smell_range_m}m`}</p>
            </IonLabel>
            <IonBadge color="warning" slot="end">{card.senses}</IonBadge>
          </IonItem>
        </IonList>

        {/* Complete Scientific Data */}
        <IonList>
          <IonListHeader>
            <IonIcon icon={library} />
            <IonLabel>🔬 Complete Scientific Data</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonLabel>
              <h3>🎓 Educational Mission</h3>
              <p><em>"Every game mechanic is based on real scientific data. We believe in complete educational transparency."</em></p>
            </IonLabel>
          </IonItem>
        </IonList>

        {/* Physical Characteristics */}
        <IonList>
          <IonListHeader>
            <IonLabel>📏 Physical Characteristics</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonIcon icon={flash} slot="start" color="danger" />
            <IonLabel>
              <h3>Body Mass</h3>
              <p><strong>{card.realData?.mass_kg}kg</strong> - Primary factor in power calculation</p>
            </IonLabel>
          </IonItem>

          {card.realData?.lifespan_Max_Days && (
            <IonItem>
              <IonIcon icon={heart} slot="start" color="success" />
              <IonLabel>
                <h3>Maximum Lifespan</h3>
                <p><strong>{Math.round(card.realData.lifespan_Max_Days / 365)} years</strong> ({card.realData.lifespan_Max_Days} days)</p>
              </IonLabel>
            </IonItem>
          )}
        </IonList>

        {/* Movement & Speed */}
        <IonList>
          <IonListHeader>
            <IonLabel>🏃 Movement & Speed</IonLabel>
          </IonListHeader>

          {card.realData?.walk_Speed_m_per_hr && card.realData.walk_Speed_m_per_hr > 0 && (
            <IonItem>
              <IonIcon icon={speedometer} slot="start" color="primary" />
              <IonLabel>
                <h3>Walking Speed</h3>
                <p><strong>{(card.realData.walk_Speed_m_per_hr / 1000).toFixed(1)} km/hr</strong> ({card.realData.walk_Speed_m_per_hr} m/hr)</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.run_Speed_m_per_hr && card.realData.run_Speed_m_per_hr > 0 && (
            <IonItem>
              <IonIcon icon={speedometer} slot="start" color="danger" />
              <IonLabel>
                <h3>Running Speed</h3>
                <p><strong>{(card.realData.run_Speed_m_per_hr / 1000).toFixed(1)} km/hr</strong> ({card.realData.run_Speed_m_per_hr} m/hr)</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.swim_Speed_m_per_hr && card.realData.swim_Speed_m_per_hr > 0 && (
            <IonItem>
              <IonIcon icon={speedometer} slot="start" color="tertiary" />
              <IonLabel>
                <h3>Swimming Speed</h3>
                <p><strong>{(card.realData.swim_Speed_m_per_hr / 1000).toFixed(1)} km/hr</strong> ({card.realData.swim_Speed_m_per_hr} m/hr)</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.burrow_Speed_m_per_hr && card.realData.burrow_Speed_m_per_hr > 0 && (
            <IonItem>
              <IonIcon icon={speedometer} slot="start" color="secondary" />
              <IonLabel>
                <h3>Burrowing Speed</h3>
                <p><strong>{(card.realData.burrow_Speed_m_per_hr / 1000).toFixed(1)} km/hr</strong> ({card.realData.burrow_Speed_m_per_hr} m/hr)</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.fly_Speed_m_per_hr && card.realData.fly_Speed_m_per_hr > 0 && (
            <IonItem>
              <IonIcon icon={speedometer} slot="start" color="warning" />
              <IonLabel>
                <h3>Flying Speed</h3>
                <p><strong>{(card.realData.fly_Speed_m_per_hr / 1000).toFixed(1)} km/hr</strong> ({card.realData.fly_Speed_m_per_hr} m/hr)</p>
              </IonLabel>
            </IonItem>
          )}
        </IonList>

        {/* Sensory Capabilities */}
        <IonList>
          <IonListHeader>
            <IonLabel>👁️ Sensory Capabilities</IonLabel>
          </IonListHeader>

          {card.realData?.vision_range_m && (
            <IonItem>
              <IonIcon icon={eye} slot="start" color="warning" />
              <IonLabel>
                <h3>Vision Range</h3>
                <p><strong>{card.realData.vision_range_m}m</strong> - How far they can see clearly</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.hearing_range_m && (
            <IonItem>
              <IonIcon icon={eye} slot="start" color="secondary" />
              <IonLabel>
                <h3>Hearing Range</h3>
                <p><strong>{card.realData.hearing_range_m}m</strong> - Maximum distance for sound detection</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.smell_range_m && card.realData.smell_range_m > 0 && (
            <IonItem>
              <IonIcon icon={eye} slot="start" color="tertiary" />
              <IonLabel>
                <h3>Smell Range</h3>
                <p><strong>{card.realData.smell_range_m}m</strong> - Olfactory detection distance</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.taste_range_m && card.realData.taste_range_m > 0 && (
            <IonItem>
              <IonIcon icon={eye} slot="start" color="success" />
              <IonLabel>
                <h3>Taste Range</h3>
                <p><strong>{card.realData.taste_range_m}m</strong> - Gustatory detection distance</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.touch_range_m && card.realData.touch_range_m > 0 && (
            <IonItem>
              <IonIcon icon={eye} slot="start" color="medium" />
              <IonLabel>
                <h3>Touch Range</h3>
                <p><strong>{card.realData.touch_range_m}m</strong> - Tactile detection distance</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.heat_range_m && card.realData.heat_range_m > 0 && (
            <IonItem>
              <IonIcon icon={eye} slot="start" color="danger" />
              <IonLabel>
                <h3>Heat Detection</h3>
                <p><strong>{card.realData.heat_range_m}m</strong> - Thermal sensing range</p>
              </IonLabel>
            </IonItem>
          )}
        </IonList>

        {/* Environmental Tolerance */}
        <IonList>
          <IonListHeader>
            <IonLabel>🌡️ Environmental Tolerance</IonLabel>
          </IonListHeader>

          {card.realData?.temperatureMinimum_C !== undefined && card.realData?.temperatureMaximum_C !== undefined && (
            <IonItem>
              <IonIcon icon={thermometer} slot="start" color="danger" />
              <IonLabel>
                <h3>Temperature Range</h3>
                <p><strong>{card.realData.temperatureMinimum_C}°C to {card.realData.temperatureMaximum_C}°C</strong></p>
                <p>Optimal: {card.realData.temperatureOptimalMin_C}°C - {card.realData.temperatureOptimalMax_C}°C</p>
              </IonLabel>
            </IonItem>
          )}

          {card.realData?.moistureOptimal_pct !== undefined && (
            <IonItem>
              <IonIcon icon={water} slot="start" color="primary" />
              <IonLabel>
                <h3>Moisture Requirements</h3>
                <p><strong>Optimal: {card.realData.moistureOptimal_pct}%</strong></p>
                <p>Tolerance: ±{card.realData.moistureTolerance_pct}%, Lethal below: {card.realData.moistureLethal_pct}%</p>
              </IonLabel>
            </IonItem>
          )}
        </IonList>

        {/* Game Stat Calculations */}
        <IonList>
          <IonListHeader>
            <IonLabel>🎮 How Game Stats Are Calculated</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonIcon icon={flash} slot="start" color="danger" />
            <IonLabel>
              <h3>Power = {card.power}</h3>
              <p><strong>Real Values:</strong></p>
              <p>• Body mass: {card.realData?.mass_kg}kg</p>
              {card.realData?.run_Speed_m_per_hr && <p>• Running speed: {(card.realData.run_Speed_m_per_hr / 1000).toFixed(1)}km/hr</p>}
              {card.realData?.vision_range_m && <p>• Vision range: {card.realData.vision_range_m}m</p>}
              <p>• Trophic role: {card.trophicRole}</p>
            </IonLabel>
            <IonBadge color="danger" slot="end">{card.power}</IonBadge>
          </IonItem>

          <IonItem>
            <IonIcon icon={heart} slot="start" color="success" />
            <IonLabel>
              <h3>Health = {card.health}</h3>
              <p><strong>Real Values:</strong></p>
              <p>• Body mass: {card.realData?.mass_kg}kg</p>
              {card.realData?.lifespan_Max_Days && <p>• Lifespan: {Math.round(card.realData.lifespan_Max_Days / 365)} years</p>}
              {card.realData?.temperatureMinimum_C !== undefined && card.realData?.temperatureMaximum_C !== undefined &&
                <p>• Temperature range: {card.realData.temperatureMinimum_C}°C to {card.realData.temperatureMaximum_C}°C</p>}
              <p>• Conservation status: {card.conservationStatus}</p>
            </IonLabel>
            <IonBadge color="success" slot="end">{card.health}</IonBadge>
          </IonItem>

          <IonItem>
            <IonIcon icon={speedometer} slot="start" color="primary" />
            <IonLabel>
              <h3>Speed = {card.speed}</h3>
              <p><strong>Real Values:</strong></p>
              {card.realData?.walk_Speed_m_per_hr && card.realData.walk_Speed_m_per_hr > 0 && <p>• Walking: {(card.realData.walk_Speed_m_per_hr / 1000).toFixed(1)}km/hr ({card.realData.walk_Speed_m_per_hr}m/hr)</p>}
              {card.realData?.run_Speed_m_per_hr && card.realData.run_Speed_m_per_hr > 0 && <p>• Running: {(card.realData.run_Speed_m_per_hr / 1000).toFixed(1)}km/hr ({card.realData.run_Speed_m_per_hr}m/hr)</p>}
              {card.realData?.swim_Speed_m_per_hr && card.realData.swim_Speed_m_per_hr > 0 && <p>• Swimming: {(card.realData.swim_Speed_m_per_hr / 1000).toFixed(1)}km/hr ({card.realData.swim_Speed_m_per_hr}m/hr)</p>}
              {card.realData?.burrow_Speed_m_per_hr && card.realData.burrow_Speed_m_per_hr > 0 && <p>• Burrowing: {(card.realData.burrow_Speed_m_per_hr / 1000).toFixed(1)}km/hr ({card.realData.burrow_Speed_m_per_hr}m/hr)</p>}
              {card.realData?.fly_Speed_m_per_hr && card.realData.fly_Speed_m_per_hr > 0 && <p>• Flying: {(card.realData.fly_Speed_m_per_hr / 1000).toFixed(1)}km/hr ({card.realData.fly_Speed_m_per_hr}m/hr)</p>}
              <p>• Habitat: {card.habitat}</p>
            </IonLabel>
            <IonBadge color="primary" slot="end">{card.speed}</IonBadge>
          </IonItem>

          <IonItem>
            <IonIcon icon={eye} slot="start" color="warning" />
            <IonLabel>
              <h3>Senses = {card.senses}</h3>
              <p><strong>Real Values:</strong></p>
              {card.realData?.vision_range_m && card.realData.vision_range_m > 0 && <p>• Vision: {card.realData.vision_range_m}m</p>}
              {card.realData?.hearing_range_m && card.realData.hearing_range_m > 0 && <p>• Hearing: {card.realData.hearing_range_m}m</p>}
              {card.realData?.smell_range_m && card.realData.smell_range_m > 0 && <p>• Smell: {card.realData.smell_range_m}m</p>}
              {card.realData?.taste_range_m && card.realData.taste_range_m > 0 && <p>• Taste: {card.realData.taste_range_m}m</p>}
              {card.realData?.touch_range_m && card.realData.touch_range_m > 0 && <p>• Touch: {card.realData.touch_range_m}m</p>}
              {card.realData?.heat_range_m && card.realData.heat_range_m > 0 && <p>• Heat detection: {card.realData.heat_range_m}m</p>}
              <p>• Habitat adaptation: {card.habitat}</p>
            </IonLabel>
            <IonBadge color="warning" slot="end">{card.senses}</IonBadge>
          </IonItem>
        </IonList>

        {/* Abilities */}
        {card.abilities.length > 0 && (
          <IonList>
            <IonListHeader>
              <IonIcon icon={flash} />
              <IonLabel>Special Abilities</IonLabel>
            </IonListHeader>
            
            {card.abilities.map((ability) => (
              <IonItem key={ability.id}>
                <IonLabel>
                  <h3>{ability.name}</h3>
                  <p>{ability.description}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Description */}
        <IonList>
          <IonListHeader>
            <IonIcon icon={library} />
            <IonLabel>Description</IonLabel>
          </IonListHeader>
          
          <IonItem>
            <IonLabel className="ion-text-wrap">
              <p>{card.description}</p>
            </IonLabel>
          </IonItem>
        </IonList>

        {/* Add to Deck Button */}
        {showAddToDeck && onAddToDeck && (
          <div style={{ padding: '16px' }}>
            <IonButton
              expand="block"
              onClick={() => {
                onAddToDeck(card);
                onClose();
              }}
            >
              <IonIcon icon={flash} slot="start" />
              Add to Deck
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default CardDetailsModal;
