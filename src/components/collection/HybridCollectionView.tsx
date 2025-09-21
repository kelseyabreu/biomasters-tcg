/**
 * Hybrid Collection View
 * Shows owned cards (colored) and unowned cards (greyed out)
 * Integrates JSON data with database ownership
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSearchbar, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonBadge, IonButton, IonIcon, IonProgressBar, IonText, IonSelect, IonSelectOption, IonModal, IonButtons, IonCheckbox, IonItem, IonList, IonLabel } from '@ionic/react';
import { search, filter, statsChart, sync, options, close } from 'ionicons/icons';
import { Card, ConservationStatus } from '../../types';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { useUILocalization, useCardLocalization } from '../../hooks/useCardLocalization';
import { getCollectionStats, isCardOwnedByNameId, getCardOwnershipByNameId, UITextId } from '@kelseyabreu/shared';

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
  const { getUIText } = useUILocalization();
  const { getCardName, getScientificName } = useCardLocalization();
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'owned' | 'unowned'>('all');
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Advanced filtering states
  const [rarityFilter, setRarityFilter] = useState<string | ConservationStatus>('all');
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
    loadOfflineCollection,
    pendingActions,
    lastSyncTime,
    syncError,
    isAuthenticated
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

  // Memoized individual filter functions for performance
  const ownershipFilter = useCallback((species: Card) => {
    if (selectedFilter === 'owned') {
      return isCardOwnedByNameId(species.nameId, offlineCollection?.cards_owned || {});
    } else if (selectedFilter === 'unowned') {
      return !isCardOwnedByNameId(species.nameId, offlineCollection?.cards_owned || {});
    }
    return true;
  }, [selectedFilter, offlineCollection?.cards_owned]);

  const rarityFilterFn = useCallback((species: Card) => {
    return rarityFilter === 'all' || species.conservationStatus === rarityFilter;
  }, [rarityFilter]);

  const typeFilterFn = useCallback((species: Card) => {
    return typeFilter === 'all' || species.trophicRole === typeFilter;
  }, [typeFilter]);

  const trophicRoleFilterFn = useCallback((species: Card) => {
    return trophicRoleFilter === 'all' || species.trophicRole === trophicRoleFilter;
  }, [trophicRoleFilter]);

  const searchFilterFn = useCallback((species: Card) => {
    if (!searchText.trim()) return true;
    const searchLower = searchText.toLowerCase();
    const localizedName = getCardName(species.nameId as any);
    const localizedScientificName = getScientificName(species.scientificNameId as any);
    return localizedName.toLowerCase().includes(searchLower) ||
           localizedScientificName.toLowerCase().includes(searchLower) ||
           species.habitat.toString().toLowerCase().includes(searchLower) ||
           species.trophicRole.toString().toLowerCase().includes(searchLower);
  }, [searchText, getCardName, getScientificName]);

  const sortFunction = useCallback((a: Card, b: Card) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        const localizedA = getCardName(a.nameId as any);
        const localizedB = getCardName(b.nameId as any);
        comparison = localizedA.localeCompare(localizedB);
        break;
      case 'rarity':
        comparison = a.conservationStatus - b.conservationStatus;
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
    return sortOrder === 'desc' ? -comparison : comparison;
  }, [sortBy, sortOrder, getCardName]);

  // Advanced filter and search logic with memoized filters
  const filteredSpecies = useMemo(() => {
    return allSpeciesCards
      .filter(ownershipFilter)
      .filter(rarityFilterFn)
      .filter(typeFilterFn)
      .filter(trophicRoleFilterFn)
      .filter(searchFilterFn)
      .sort(sortFunction);
  }, [allSpeciesCards, ownershipFilter, rarityFilterFn, typeFilterFn, trophicRoleFilterFn, searchFilterFn, sortFunction]);

  // Collection statistics
  const collectionStats = useMemo(() => {
    const totalSpecies = allSpeciesCards.length;
    const { ownedSpecies, totalCards } = getCollectionStats(offlineCollection?.cards_owned || {});

    return {
      totalSpecies,
      ownedSpecies,
      totalCards,
      completionPercentage: totalSpecies > 0 ? Math.round((ownedSpecies / totalSpecies) * 100) : 0
    };
  }, [allSpeciesCards, offlineCollection]);

  const handleCardClick = (species: Card) => {
    const isOwned = isCardOwnedByNameId(species.nameId, offlineCollection?.cards_owned || {});

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
    console.log('🔄 [COLLECTION-UI] handleSync called:', {
      isOnline,
      syncStatus,
      pendingActions,
      isAuthenticated,
      timestamp: new Date().toISOString()
    });

    if (isOnline) {
      console.log('🔄 [COLLECTION-UI] Triggering syncCollection...');
      try {
        await syncCollection();
        console.log('✅ [COLLECTION-UI] syncCollection completed');
      } catch (error) {
        console.error('❌ [COLLECTION-UI] syncCollection failed:', error);
      }
    } else {
      console.log('⚠️ [COLLECTION-UI] Cannot sync - device is offline');
    }
  };

  if (!speciesLoaded && !loadingTimeout) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{getUIText(UITextId.UI_TAB_COLLECTION)}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="loading-container">
            <IonProgressBar type="indeterminate" />
            <IonText>{getUIText(UITextId.UI_LOADING_SPECIES_DATA)}</IonText>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
              {getUIText(UITextId.UI_LOADING_TIMEOUT_MESSAGE)}
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
            <IonTitle>{getUIText(UITextId.UI_TAB_COLLECTION)}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h2>{getUIText(UITextId.UI_LOADING_FAILED)}</h2>
            <p>{getUIText(UITextId.UI_LOADING_FAILED_REASONS)}</p>
            <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
              <li>{getUIText(UITextId.UI_NETWORK_ISSUES)}</li>
              <li>{getUIText(UITextId.UI_MISSING_DATA_FILES)}</li>
              <li>{getUIText(UITextId.UI_BROWSER_COMPATIBILITY)}</li>
            </ul>
            <IonButton
              expand="block"
              onClick={() => window.location.reload()}
              style={{ marginTop: '20px' }}
            >
              {getUIText(UITextId.UI_REFRESH_PAGE)}
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
          <IonTitle>{getUIText(UITextId.UI_TAB_COLLECTION)}</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        {/* Sync Status */}
        <SyncStatus
          isOnline={isOnline}
          syncStatus={syncStatus}
          onSync={handleSync}
          pendingActions={pendingActions}
          lastSyncTime={lastSyncTime}
          syncError={syncError}
        />

        {/* Collection Statistics */}
        <CollectionStats stats={collectionStats} />

        {/* Search and Filter */}
        <div className="collection-controls">
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            placeholder={getUIText(UITextId.UI_SEARCH_SPECIES)}
            showClearButton="focus"
          />
          
          <div className="filter-buttons">
            <IonButton
              fill={selectedFilter === 'all' ? 'solid' : 'outline'}
              size="small"
              onClick={() => setSelectedFilter('all')}
            >
              {getUIText(UITextId.UI_ALL)} ({allSpeciesCards.length})
            </IonButton>
            <IonButton
              fill={selectedFilter === 'owned' ? 'solid' : 'outline'}
              size="small"
              onClick={() => setSelectedFilter('owned')}
            >
              {getUIText(UITextId.UI_OWNED)} ({collectionStats.ownedSpecies})
            </IonButton>
            <IonButton
              fill={selectedFilter === 'unowned' ? 'solid' : 'outline'}
              size="small"
              onClick={() => setSelectedFilter('unowned')}
            >
              {getUIText(UITextId.UI_UNOWNED)} ({collectionStats.totalSpecies - collectionStats.ownedSpecies})
            </IonButton>

            {/* Property Filter Button */}
            <IonButton
              fill="outline"
              size="small"
              onClick={() => setShowPropertyModal(true)}
            >
              <IonIcon icon={options} slot="start" />
              {getUIText(UITextId.UI_PROPERTIES)}
            </IonButton>
          </div>

          {/* Advanced Filters */}
          <div className="advanced-filters" style={{ marginTop: '10px' }}>
            <IonGrid>
              <IonRow>
                <IonCol size="6" sizeMd="3">
                  <IonSelect
                    value={rarityFilter}
                    placeholder={getUIText(UITextId.UI_CONSERVATION_STATUS)}
                    onIonChange={(e) => setRarityFilter(e.detail.value)}
                  >
                    <IonSelectOption value="all">{getUIText(UITextId.UI_ALL_STATUS)}</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.LEAST_CONCERN}>{getUIText(UITextId.UI_LEAST_CONCERN)}</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.NEAR_THREATENED}>{getUIText(UITextId.UI_NEAR_THREATENED)}</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.VULNERABLE}>{getUIText(UITextId.UI_VULNERABLE)}</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.ENDANGERED}>{getUIText(UITextId.UI_ENDANGERED)}</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.CRITICALLY_ENDANGERED}>{getUIText(UITextId.UI_CRITICALLY_ENDANGERED)}</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.EXTINCT}>Extinct</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.EXTINCT_IN_WILD}>Extinct in Wild</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.DATA_DEFICIENT}>Data Deficient</IonSelectOption>
                    <IonSelectOption value={ConservationStatus.NOT_EVALUATED}>Not Evaluated</IonSelectOption>
                  </IonSelect>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonSelect
                    value={trophicRoleFilter}
                    placeholder={getUIText(UITextId.UI_TROPHIC_ROLE)}
                    onIonChange={(e) => setTrophicRoleFilter(e.detail.value)}
                  >
                    <IonSelectOption value="all">{getUIText(UITextId.UI_ALL_ROLES)}</IonSelectOption>
                    <IonSelectOption value="Producer">{getUIText(UITextId.UI_PRODUCER)}</IonSelectOption>
                    <IonSelectOption value="Herbivore">{getUIText(UITextId.UI_HERBIVORE)}</IonSelectOption>
                    <IonSelectOption value="Carnivore">{getUIText(UITextId.UI_CARNIVORE)}</IonSelectOption>
                    <IonSelectOption value="Omnivore">{getUIText(UITextId.UI_OMNIVORE)}</IonSelectOption>
                    <IonSelectOption value="Decomposer">{getUIText(UITextId.UI_DECOMPOSER)}</IonSelectOption>
                  </IonSelect>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonSelect
                    value={sortBy}
                    placeholder={getUIText(UITextId.UI_SORT_BY)}
                    onIonChange={(e) => setSortBy(e.detail.value)}
                  >
                    <IonSelectOption value="name">{getUIText(UITextId.UI_NAME)}</IonSelectOption>
                    <IonSelectOption value="rarity">{getUIText(UITextId.UI_CONSERVATION_STATUS)}</IonSelectOption>
                    <IonSelectOption value="attack">{getUIText(UITextId.UI_POWER)}</IonSelectOption>
                    <IonSelectOption value="health">{getUIText(UITextId.UI_HEALTH)}</IonSelectOption>
                    <IonSelectOption value="cost">{getUIText(UITextId.UI_ENERGY_COST)}</IonSelectOption>
                  </IonSelect>
                </IonCol>
                <IonCol size="6" sizeMd="3">
                  <IonButton
                    fill="outline"
                    size="small"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? getUIText(UITextId.UI_ASCENDING) : getUIText(UITextId.UI_DESCENDING)}
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
              const ownershipData = getCardOwnershipByNameId(species.nameId, offlineCollection?.cards_owned || {});
              const isOwned = !!ownershipData;

              return (
                <IonCol size="6" sizeMd="4" sizeLg="3" key={species.nameId}>
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
              <h3>{getUIText(UITextId.UI_NO_SPECIES_FOUND)}</h3>
              <p>{getUIText(UITextId.UI_ADJUST_SEARCH_FILTER)}</p>
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
