/**
 * BioMasters TCG - Taxonomy Browser Component
 * 
 * Interactive component for browsing cards by taxonomic classification.
 * Uses the new enum-based taxonomy system for high-performance filtering.
 */

import React, { useState, useEffect } from 'react';
import {
  TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass
} from '@kelseyabreu/shared';
import { CardData } from '@kelseyabreu/shared';
import { useLocalization } from '../../contexts/LocalizationContext';
import './TaxonomyBrowser.css';

interface TaxonomyBrowserProps {
  cards: CardData[];
  onCardSelect?: (card: CardData) => void;
  className?: string;
}

type TaxonomyLevel = 'domain' | 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus' | 'species';

export const TaxonomyBrowser: React.FC<TaxonomyBrowserProps> = ({
  cards,
  onCardSelect,
  className = ''
}) => {
  const localization = useLocalization();
  const [selectedLevel, setSelectedLevel] = useState<TaxonomyLevel>('kingdom');
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [filteredCards, setFilteredCards] = useState<CardData[]>(cards);

  // Filter cards when selection changes
  useEffect(() => {
    if (selectedValue === null) {
      setFilteredCards(cards);
      return;
    }

    let filtered: CardData[] = [];

    switch (selectedLevel) {
      case 'domain':
        filtered = cards.filter(card => card.taxoDomain === selectedValue);
        break;
      case 'kingdom':
        filtered = cards.filter(card => card.taxoKingdom === selectedValue);
        break;
      case 'phylum':
        filtered = cards.filter(card => card.taxoPhylum === selectedValue);
        break;
      case 'class':
        filtered = cards.filter(card => card.taxoClass === selectedValue);
        break;
      case 'order':
        filtered = cards.filter(card => card.taxoOrder === selectedValue);
        break;
      case 'family':
        filtered = cards.filter(card => card.taxoFamily === selectedValue);
        break;
      case 'genus':
        filtered = cards.filter(card => card.taxoGenus === selectedValue);
        break;
      case 'species':
        filtered = cards.filter(card => card.taxoSpecies === selectedValue);
        break;
    }

    setFilteredCards(filtered);
  }, [cards, selectedLevel, selectedValue]);

  // Get unique values for the selected taxonomic level
  const getUniqueValues = (): Array<{ value: number; displayName: string; count: number }> => {
    const valueMap = new Map<number, number>();
    
    cards.forEach(card => {
      let value: number | undefined;
      
      switch (selectedLevel) {
        case 'domain':
          value = card.taxoDomain;
          break;
        case 'kingdom':
          value = card.taxoKingdom;
          break;
        case 'phylum':
          value = card.taxoPhylum;
          break;
        case 'class':
          value = card.taxoClass;
          break;
        case 'order':
          value = card.taxoOrder;
          break;
        case 'family':
          value = card.taxoFamily;
          break;
        case 'genus':
          value = card.taxoGenus;
          break;
        case 'species':
          value = card.taxoSpecies;
          break;
      }
      
      if (value) {
        valueMap.set(value, (valueMap.get(value) || 0) + 1);
      }
    });

    return Array.from(valueMap.entries()).map(([value, count]) => ({
      value,
      displayName: getDisplayName(value),
      count
    })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  // Get display name for a taxonomy value
  const getDisplayName = (value: number): string => {
    // Simple display names for demo
    const displayNames: Record<string, Record<number, string>> = {
      domain: { 1: 'Eukaryota', 2: 'Bacteria', 3: 'Archaea' },
      kingdom: { 1: 'Animalia', 2: 'Plantae', 3: 'Fungi', 4: 'Protista' },
      phylum: { 1: 'Chordata', 2: 'Arthropoda', 3: 'Mollusca' },
      class: { 1: 'Mammalia', 2: 'Aves', 3: 'Reptilia' }
    };

    return displayNames[selectedLevel]?.[value] || `${selectedLevel} ${value}`;
  };

  // Quick filter buttons for common groups
  const getQuickFilters = () => {
    return [
      { label: 'All Animals', action: () => { setSelectedLevel('kingdom'); setSelectedValue(TaxoKingdom.ANIMALIA); } },
      { label: 'All Plants', action: () => { setSelectedLevel('kingdom'); setSelectedValue(TaxoKingdom.PLANTAE); } },
      { label: 'All Fungi', action: () => { setSelectedLevel('kingdom'); setSelectedValue(TaxoKingdom.FUNGI); } },
      { label: 'All Bacteria', action: () => { setSelectedLevel('domain'); setSelectedValue(TaxoDomain.BACTERIA); } },
      { label: 'Mammals', action: () => { setSelectedLevel('class'); setSelectedValue(1); } }, // TaxoClass.MAMMALIA
      { label: 'Birds', action: () => { setSelectedLevel('class'); setSelectedValue(2); } }, // TaxoClass.AVES
      { label: 'Carnivores', action: () => { setSelectedLevel('order'); setSelectedValue(2); } }, // TaxoOrder.CARNIVORA
      { label: 'Primates', action: () => { setSelectedLevel('order'); setSelectedValue(1); } }, // TaxoOrder.PRIMATES
    ];
  };

  const uniqueValues = getUniqueValues();
  const quickFilters = getQuickFilters();

  return (
    <div className={`taxonomy-browser ${className}`}>
      <div className="taxonomy-browser__header">
        <h3>Browse by Taxonomy</h3>
        <div className="taxonomy-browser__stats">
          Showing {filteredCards.length} of {cards.length} cards
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="taxonomy-browser__quick-filters">
        <h4>Quick Filters</h4>
        <div className="quick-filter-buttons">
          {quickFilters.map((filter, index) => (
            <button
              key={index}
              className="quick-filter-btn"
              onClick={filter.action}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Taxonomic Level Selector */}
      <div className="taxonomy-browser__level-selector">
        <h4>Taxonomic Level</h4>
        <select
          value={selectedLevel}
          onChange={(e) => {
            setSelectedLevel(e.target.value as TaxonomyLevel);
            setSelectedValue(null);
          }}
          className="level-select"
        >
          <option value="domain">Domain</option>
          <option value="kingdom">Kingdom</option>
          <option value="phylum">Phylum</option>
          <option value="class">Class</option>
          <option value="order">Order</option>
          <option value="family">Family</option>
          <option value="genus">Genus</option>
          <option value="species">Species</option>
        </select>
      </div>

      {/* Value Selector */}
      <div className="taxonomy-browser__value-selector">
        <h4>Select {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)}</h4>
        <div className="value-buttons">
          <button
            className={`value-btn ${selectedValue === null ? 'active' : ''}`}
            onClick={() => setSelectedValue(null)}
          >
            All ({cards.length})
          </button>
          {uniqueValues.map(({ value, displayName, count }) => (
            <button
              key={value}
              className={`value-btn ${selectedValue === value ? 'active' : ''}`}
              onClick={() => setSelectedValue(value)}
            >
              {displayName} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Filtered Cards Display */}
      <div className="taxonomy-browser__results">
        <h4>Cards ({filteredCards.length})</h4>
        <div className="card-grid">
          {filteredCards.map((card) => (
            <div
              key={card.cardId}
              className="card-item"
              onClick={() => onCardSelect?.(card)}
            >
              <div className="card-name">
                {card.nameId}
              </div>
              <div className="card-scientific">
                {card.scientificNameId}
              </div>
              <div className="card-taxonomy">
                Domain: {card.taxoDomain}, Kingdom: {card.taxoKingdom}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diversity Stats */}
      <div className="taxonomy-browser__stats-panel">
        <h4>Taxonomic Diversity</h4>
        <div className="diversity-stats">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Cards:</span>
              <span className="stat-value">{cards.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Filtered:</span>
              <span className="stat-value">{filteredCards.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Level:</span>
              <span className="stat-value">{selectedLevel}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Value:</span>
              <span className="stat-value">{selectedValue || 'All'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
