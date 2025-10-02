/**
 * BioMasters TCG - Taxonomy Demo Page
 * 
 * Demonstrates the new enum-based taxonomy system with filtering and browsing.
 * Shows integration between client and server using the new API endpoints.
 */

import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonToast
} from '@ionic/react';
import { sharedDataLoader } from '@kelseyabreu/shared';

// For now, let's use a simpler approach and load JSON directly
interface SimpleCardData {
  cardId: number;
  nameId: string;
  scientificNameId?: string;
  descriptionId?: string;
  taxonomyId?: string;
  taxoDomain?: number;
  taxoKingdom?: number;
  taxoPhylum?: number;
  taxoClass?: number;
  taxoOrder?: number;
  taxoFamily?: number;
  taxoGenus?: number;
  taxoSpecies?: number;
}
import './TaxonomyDemo.css';

export const TaxonomyDemo: React.FC = () => {
  const [cards, setCards] = useState<SimpleCardData[]>([]);
  const [diversityStats, setDiversityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard] = useState<SimpleCardData | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load cards using sharedDataLoader with advanced caching and background updates
      console.log('📚 Loading cards using sharedDataLoader...');
      const result = await sharedDataLoader.loadCards();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load cards');
      }

      const cardsArray: SimpleCardData[] = result.data;
      console.log(`📚 Loaded ${cardsArray.length} cards for taxonomy demo`);

      setCards(cardsArray);

      // Calculate basic diversity stats from the loaded cards
      const stats = calculateDiversityStats(cardsArray);
      setDiversityStats(stats);

    } catch (err) {
      console.error('Error loading taxonomy data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate diversity stats from cards
  const calculateDiversityStats = (cards: SimpleCardData[]) => {
    const domains = new Set();
    const kingdoms = new Set();
    const phylums = new Set();
    const classes = new Set();
    const orders = new Set();
    const families = new Set();
    const genera = new Set();
    const species = new Set();

    cards.forEach(card => {
      if (card.taxoDomain) domains.add(card.taxoDomain);
      if (card.taxoKingdom) kingdoms.add(card.taxoKingdom);
      if (card.taxoPhylum) phylums.add(card.taxoPhylum);
      if (card.taxoClass) classes.add(card.taxoClass);
      if (card.taxoOrder) orders.add(card.taxoOrder);
      if (card.taxoFamily) families.add(card.taxoFamily);
      if (card.taxoGenus) genera.add(card.taxoGenus);
      if (card.taxoSpecies) species.add(card.taxoSpecies);
    });

    return {
      domains: domains.size,
      kingdoms: kingdoms.size,
      phylums: phylums.size,
      classes: classes.size,
      orders: orders.size,
      families: families.size,
      genera: genera.size,
      species: species.size
    };
  };


  const testQuickFilters = async () => {
    try {
      setLoading(true);

      // Test different taxonomy filters using local data
      const animals = cards.filter(card => card.taxoKingdom === 2); // Animalia
      const plants = cards.filter(card => card.taxoKingdom === 3); // Plantae
      const mammals = cards.filter(card => card.taxoClass === 1); // Mammalia

      console.log(`Animals: ${animals.length} cards found`);
      console.log(`Plants: ${plants.length} cards found`);
      console.log(`Mammals: ${mammals.length} cards found`);

      setToastMessage('Quick filter tests completed - check console');
      setShowToast(true);
    } catch (err) {
      console.error('Error testing filters:', err);
      setError('Failed to test filters');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !cards.length) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/tabs/tab1" />
            </IonButtons>
            <IonTitle>Taxonomy Demo</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading taxonomy data...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/tabs/tab1" />
            </IonButtons>
            <IonTitle>Taxonomy Demo</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="">
          <IonCard color="danger">
            <IonCardHeader>
              <IonCardTitle>Error Loading Data</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>{error}</p>
              <IonButton onClick={loadData} fill="outline">
                Retry
              </IonButton>
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/tab1" />
          </IonButtons>
          <IonTitle>Taxonomy Demo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={testQuickFilters} fill="outline" size="small">
              Test Filters
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="taxonomy-demo-container">
          {/* Header Stats */}
          {diversityStats && (
            <IonCard className="stats-card">
              <IonCardHeader>
                <IonCardTitle>Taxonomic Diversity</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="3">
                      <div className="stat-item">
                        <div className="stat-value">{diversityStats.domains}</div>
                        <div className="stat-label">Domains</div>
                      </div>
                    </IonCol>
                    <IonCol size="3">
                      <div className="stat-item">
                        <div className="stat-value">{diversityStats.kingdoms}</div>
                        <div className="stat-label">Kingdoms</div>
                      </div>
                    </IonCol>
                    <IonCol size="3">
                      <div className="stat-item">
                        <div className="stat-value">{diversityStats.classes}</div>
                        <div className="stat-label">Classes</div>
                      </div>
                    </IonCol>
                    <IonCol size="3">
                      <div className="stat-item">
                        <div className="stat-value">{diversityStats.species}</div>
                        <div className="stat-label">Species</div>
                      </div>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>
          )}

          {/* Selected Card Info */}
          {selectedCard && (
            <IonCard className="selected-card">
              <IonCardHeader>
                <IonCardTitle>Selected Card</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="selected-card-info">
                  <div><strong>Card ID:</strong> {selectedCard.cardId}</div>
                  <div><strong>Name ID:</strong> {selectedCard.nameId}</div>
                  <div><strong>Scientific Name ID:</strong> {selectedCard.scientificNameId}</div>
                  <div><strong>Domain:</strong> {selectedCard.taxoDomain || 'N/A'}</div>
                  <div><strong>Kingdom:</strong> {selectedCard.taxoKingdom || 'N/A'}</div>
                  <div><strong>Phylum:</strong> {selectedCard.taxoPhylum || 'N/A'}</div>
                  <div><strong>Class:</strong> {selectedCard.taxoClass || 'N/A'}</div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Main Taxonomy Browser */}
          <IonCard className="browser-card">
            <IonCardContent>
              <h3>Taxonomy Demo - JSON Data Loaded</h3>
              <p>Total cards loaded: {cards.length}</p>

              {diversityStats && (
                <div className="diversity-stats">
                  <h4>Diversity Statistics:</h4>
                  <ul>
                    <li>Domains: {diversityStats.domains}</li>
                    <li>Kingdoms: {diversityStats.kingdoms}</li>
                    <li>Phylums: {diversityStats.phylums}</li>
                    <li>Classes: {diversityStats.classes}</li>
                    <li>Orders: {diversityStats.orders}</li>
                    <li>Families: {diversityStats.families}</li>
                    <li>Genera: {diversityStats.genera}</li>
                    <li>Species: {diversityStats.species}</li>
                  </ul>
                </div>
              )}

              <div className="card-samples">
                <h4>Sample Cards with Taxonomy:</h4>
                {cards.slice(0, 5).map(card => (
                  <div key={card.cardId} className="card-sample">
                    <strong>{card.nameId}</strong> (ID: {card.cardId})
                    {card.taxoKingdom && <span> - Kingdom: {card.taxoKingdom}</span>}
                    {card.taxoClass && <span> - Class: {card.taxoClass}</span>}
                  </div>
                ))}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Local Data Testing Section */}
          <IonCard className="testing-card">
            <IonCardHeader>
              <IonCardTitle>Local Data Testing</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>
                This demo showcases the new enum-based taxonomy system using JSON data.
                The data is loaded directly from the cards.json file and filtered locally.
              </p>
              <div className="test-buttons">
                <IonButton
                  onClick={testQuickFilters}
                  fill="outline"
                  size="small"
                >
                  Test Local Filters
                </IonButton>
                <IonButton
                  onClick={loadData}
                  fill="outline"
                  size="small"
                >
                  Reload Data
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default TaxonomyDemo;
