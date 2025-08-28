/**
 * Hybrid Collection View
 * Shows owned cards (colored) and unowned cards (greyed out)
 * Integrates JSON data with database ownership
 */

import React, { useState, useEffect, useMemo } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSearchbar, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonBadge, IonButton, IonIcon, IonProgressBar, IonText, IonSelect, IonSelectOption, IonModal, IonButtons, IonCheckbox, IonItem, IonList, IonLabel } from '@ionic/react';
import { search, filter, statsChart, sync, options, close } from 'ionicons/icons';
import { Card } from '../../types';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { CollectionCard, CardPropertyFilter } from './CollectionCard';
import { CollectionStats } from './CollectionStats';
import { SyncStatus } from './SyncStatus';
import PropertyFilterModal from './PropertyFilterModal';
import CardDetailsModal from '../CardDetailsModal';
import './HybridCollectionView.css';

interface CollectionViewProps {
  onCardSelect?: (card: Card) => void;
  showOnlyOwned?: boolean;
}

export const HybridCollectionView: React.FC<CollectionViewProps> = ({
  onCardSelect,
  showOnlyOwned = false
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'owned' | 'unowned'>('all');
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Advanced filtering states
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [trophicRoleFilter, setTrophicRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rarity' | 'attack' | 'health' | 'cost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Card property filter state
  const [propertyFilter, setPropertyFilter] = useState<CardPropertyFilter>({
    habitat: true,
    role: true,
    conservationStatus: true,
    acquisitionType: true
  });
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  // Card details modal state
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const {
    allSpeciesCards,
    speciesLoaded,
    loadSpeciesData,
    offlineCollection,
    isOnline,
    syncStatus,
    syncCollection,
    loadOfflineCollection
  } = useHybridGameStore();

  // Load species data and collection on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load species data through store if not already loaded
        if (!speciesLoaded) {
          console.log('🔄 HybridCollectionView: Loading species data...');
          await loadSpeciesData();
        }

        // Load offline collection
        loadOfflineCollection();
      } catch (error) {
        console.error('❌ HybridCollectionView: Failed to load data:', error);
        // Set timeout fallback after 5 seconds
        setTimeout(() => setLoadingTimeout(true), 5000);
      }
    };

    loadData();
  }, [speciesLoaded, loadSpeciesData, loadOfflineCollection]);

  // Advanced filter and search logic
  const filteredSpecies = useMemo(() => {
    let filtered = allSpeciesCards;

    // Apply ownership filter
    if (selectedFilter === 'owned') {
      filtered = filtered.filter(species =>
        offlineCollection?.species_owned[species.speciesName]
      );
    } else if (selectedFilter === 'unowned') {
      filtered = filtered.filter(species =>
        !offlineCollection?.species_owned[species.speciesName]
      );
    }

    // Apply rarity filter (using conservationStatus as rarity)
    if (rarityFilter !== 'all') {
      filtered = filtered.filter(species => species.conservationStatus === rarityFilter);
    }

    // Apply type filter (using trophicRole)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(species => species.trophicRole === typeFilter);
    }

    // Apply trophic role filter
    if (trophicRoleFilter !== 'all') {
      filtered = filtered.filter(species => species.trophicRole === trophicRoleFilter);
    }

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(species =>
        species.commonName.toLowerCase().includes(searchLower) ||
        species.scientificName.toLowerCase().includes(searchLower) ||
        species.speciesName.toLowerCase().includes(searchLower) ||
        species.habitat.toString().toLowerCase().includes(searchLower) ||
        species.trophicRole.toString().toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.commonName.localeCompare(b.commonName);
          break;
        case 'rarity':
          const rarityOrder = { 'Least Concern': 1, 'Near Threatened': 2, 'Vulnerable': 3, 'Endangered': 4, 'Critically Endangered': 5 };
          comparison = (rarityOrder[a.conservationStatus as keyof typeof rarityOrder] || 0) - (rarityOrder[b.conservationStatus as keyof typeof rarityOrder] || 0);
          break;
        case 'attack':
          comparison = a.power - b.power;
          break;
        case 'health':
          comparison = a.health - b.health;
          break;
        case 'cost':
          comparison = a.energyCost - b.energyCost;
          break;
      }

      // Apply sort order
      if (sortOrder === 'desc') comparison *= -1;

      // Secondary sort by ownership (owned first) if primary sort is equal
      if (comparison === 0) {
        const aOwned = !!offlineCollection?.species_owned[a.speciesName];
        const bOwned = !!offlineCollection?.species_owned[b.speciesName];

        if (aOwned && !bOwned) return -1;
        if (!aOwned && bOwned) return 1;

        return a.commonName.localeCompare(b.commonName);
      }

      return comparison;
    });

    return filtered;
  }, [allSpeciesCards, offlineCollection, selectedFilter, searchText, rarityFilter, typeFilter, trophicRoleFilter, sortBy, sortOrder]);

  // Collection statistics
  const collectionStats = useMemo(() => {
    const totalSpecies = allSpeciesCards.length;
    const ownedSpecies = Object.keys(offlineCollection?.species_owned || {}).length;
    const totalCards = Object.values(offlineCollection?.species_owned || {})
      .reduce((sum, card) => sum + card.quantity, 0);

    return {
      totalSpecies,
      ownedSpecies,
      totalCards,
      completionPercentage: totalSpecies > 0 ? Math.round((ownedSpecies / totalSpecies) * 100) : 0
    };
  }, [allSpeciesCards, offlineCollection]);

  const handleCardClick = (species: Card) => {
    const isOwned = !!offlineCollection?.species_owned[species.speciesName];

    // Always show card details modal for owned cards
    if (isOwned) {
      setSelectedCard(species);
      setShowCardDetails(true);
    }

    // Also call the onCardSelect prop if provided (for backward compatibility)
    if (onCardSelect) {
      onCardSelect(species);
    }

    // For unowned cards, we could show a "How to obtain" modal in the future
  };

  const handleSync = async () => {
    if (isOnline) {
      await syncCollection();
    }
  };

  if (!speciesLoaded && !loadingTimeout) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Collection</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="loading-container">
            <IonProgressBar type="indeterminate" />
            <IonText>Loading species data...</IonText>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
              If this takes too long, try refreshing the page.
            </p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // If loading timed out, show error state
  if (!speciesLoaded && loadingTimeout) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Collection</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h2>⚠️ Loading Failed</h2>
            <p>Failed to load species data. This might be due to:</p>
            <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
              <li>Network connectivity issues</li>
              <li>Missing species data files</li>
              <li>Browser compatibility issues</li>
            </ul>
            <IonButton
              expand="block"
              onClick={() => window.location.reload()}
              style={{ marginTop: '20px' }}
            >
              Refresh Page
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Collection</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        {/* Sync Status */}
        <SyncStatus 
          isOnline={isOnline}
          syncStatus={syncStatus}
          onSync={handleSync}
        />

        {/* Collection Statistics */}
        <CollectionStats stats={collectionStats} />

        {/* Search and Filter */}
        <div className="collection-controls">
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder="Search species..."
            showClearButton="focus"
          />
          
          <div className="filter-buttons">
            <IonButton
              fill={selectedFilter === 'all' ? 'solid' : 'outline'}
              size="small"
              onClick={() => setSelectedFilter('all')}
            >
              All ({allSpeciesCards.length})
            </IonButton>
            <IonButton
              fill={selectedFilter === 'owned' ? 'solid' : 'outline'}
              size="small"
              onClick={() => setSelectedFilter('owned')}
            >
              Owned ({collectionStats.ownedSpecies})
            </IonButton>
            <IonButton
              fill={selectedFilter === 'unowned' ? 'solid' : 'outline'}
              size="small"
              onClick={() => setSelectedFilter('unowned')}
            >
              Unowned ({collectionStats.totalSpecies - collectionStats.ownedSpecies})
            </IonButton>

            {/* Property Filter Button */}
            <IonButton
              fill="outline"
              size="small"
              onClick={() => setShowPropertyModal(true)}
            >
              <IonIcon icon={options} slot="start" />
              Properties
            </IonButton>
          </div>

          {/* Advanced Filters */}
          <div className="advanced-filters" style={{ marginTop: '10px' }}>
            <IonGrid>
              <IonRow>
                <IonCol size="6" sizeMd="3">
                  <IonSelect
                    value={rarityFilter}
                    placeholder="Conservation Status"
                    onIonChange={(e) => setRarityFilter(e.detail.value)}
                  >
                    <IonSelectOption value="all">All Status</IonSelectOption>
                    <IonSelectOption value="Least Concern">Least Concern</IonSelectOption>
                    <IonSelectOption value="Near Threatened">Near Threatened</IonSelectOption>
                    <IonSelectOption value="Vulnerable">Vulnerable</IonSelectOption>
                    <IonSelectOption value="Endangered">Endangered</IonSelectOption>
                    <IonSelectOption value="Critically Endangered">Critically Endangered</IonSelectOption>
                  </IonSelect>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonSelect
                    value={trophicRoleFilter}
                    placeholder="Trophic Role"
                    onIonChange={(e) => setTrophicRoleFilter(e.detail.value)}
                  >
                    <IonSelectOption value="all">All Roles</IonSelectOption>
                    <IonSelectOption value="Producer">Producer</IonSelectOption>
                    <IonSelectOption value="Herbivore">Herbivore</IonSelectOption>
                    <IonSelectOption value="Carnivore">Carnivore</IonSelectOption>
                    <IonSelectOption value="Omnivore">Omnivore</IonSelectOption>
                    <IonSelectOption value="Decomposer">Decomposer</IonSelectOption>
                  </IonSelect>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonSelect
                    value={sortBy}
                    placeholder="Sort By"
                    onIonChange={(e) => setSortBy(e.detail.value)}
                  >
                    <IonSelectOption value="name">Name</IonSelectOption>
                    <IonSelectOption value="rarity">Conservation Status</IonSelectOption>
                    <IonSelectOption value="attack">Power</IonSelectOption>
                    <IonSelectOption value="health">Health</IonSelectOption>
                    <IonSelectOption value="cost">Energy Cost</IonSelectOption>
                  </IonSelect>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonButton
                    fill="outline"
                    size="small"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </div>
        </div>

        {/* Species Grid */}
        <IonGrid className="collection-grid collection-view">
          <IonRow>
            {filteredSpecies.map((species) => {
              const ownershipData = offlineCollection?.species_owned[species.speciesName];
              const isOwned = !!ownershipData;

              return (
                <IonCol size="6" sizeMd="4" sizeLg="3" key={species.speciesName}>
                  <CollectionCard
                    species={species}
                    isOwned={isOwned}
                    quantity={ownershipData?.quantity || 0}
                    acquiredVia={ownershipData?.acquired_via}
                    onClick={() => handleCardClick(species)}
                    showBasicInfo={true} // Always show basic info for unified display
                    propertyFilter={propertyFilter}
                  />
                </IonCol>
              );
            })}
          </IonRow>
        </IonGrid>

        {/* Empty State */}
        {filteredSpecies.length === 0 && (
          <div className="empty-state">
            <IonIcon icon={search} size="large" />
            <IonText>
              <h3>No species found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </IonText>
          </div>
        )}
      </IonContent>

      {/* Property Filter Modal */}
      <PropertyFilterModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        propertyFilter={propertyFilter}
        onPropertyFilterChange={setPropertyFilter}
      />

      {/* Card Details Modal */}
      <CardDetailsModal
        isOpen={showCardDetails}
        onClose={() => {
          setShowCardDetails(false);
          setSelectedCard(null);
        }}
        card={selectedCard}
        showAddToDeck={false}
      />
    </IonPage>
  );
};

export default HybridCollectionView;
