"use strict";
/**
 * BioMasters TCG - Localization Manager
 *
 * This module provides a centralized interface for accessing localized text content.
 * It loads language-specific JSON files and provides type-safe text lookup methods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONFileDataLoader = exports.LocalizationManager = void 0;
const text_ids_1 = require("./text-ids");
// ============================================================================
// LOCALIZATION MANAGER IMPLEMENTATION
// ============================================================================
/**
 * Default implementation of the localization manager
 */
class LocalizationManager {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this._currentLanguage = text_ids_1.SupportedLanguage.ENGLISH;
        this._availableLanguages = [text_ids_1.SupportedLanguage.ENGLISH, text_ids_1.SupportedLanguage.SPANISH];
        this._languageData = null;
    }
    get currentLanguage() {
        return this._currentLanguage;
    }
    get availableLanguages() {
        return [...this._availableLanguages];
    }
    async loadLanguage(languageCode) {
        if (!this._availableLanguages.includes(languageCode)) {
            throw new Error(`Language '${languageCode}' is not available`);
        }
        this._languageData = await this.dataLoader.loadLanguageData(languageCode);
        this._currentLanguage = languageCode;
    }
    getCardName(nameId) {
        return this._languageData?.cards.names[nameId] ?? `[${nameId}]`;
    }
    getScientificName(scientificNameId) {
        return this._languageData?.cards.scientificNames[scientificNameId] ?? `[${scientificNameId}]`;
    }
    getCardDescription(descriptionId) {
        return this._languageData?.cards.descriptions[descriptionId] ?? `[${descriptionId}]`;
    }
    getAbilityName(nameId) {
        return this._languageData?.abilities.names[nameId] ?? `[${nameId}]`;
    }
    getAbilityDescription(descriptionId) {
        return this._languageData?.abilities.descriptions[descriptionId] ?? `[${descriptionId}]`;
    }
    getAbilityFlavorText(nameId) {
        return this._languageData?.abilities.flavorText?.[nameId] ?? '';
    }
    getKeywordName(keywordId) {
        return this._languageData?.ui.keywords[keywordId] ?? `[${keywordId}]`;
    }
    getUIText(textId) {
        // Search through all UI text categories
        const ui = this._languageData?.ui;
        if (!ui)
            return `[${textId}]`;
        return ui.gameActions[textId] ??
            ui.gamePhases[textId] ??
            ui.gameStates[textId] ??
            ui.errorMessages[textId] ??
            ui.gameTerms[textId] ??
            ui.trophicCategories[textId] ??
            `[${textId}]`;
    }
    getTaxonomy(taxonomyId) {
        return this._languageData?.taxonomy.taxonomy[taxonomyId] ?? null;
    }
    getFormattedScientificName(taxonomyId) {
        const taxonomy = this.getTaxonomy(taxonomyId);
        if (!taxonomy)
            return `[${taxonomyId}]`;
        return `${taxonomy.genus} ${taxonomy.species}`;
    }
    getTaxonomyName(taxonomyDisplayId) {
        const taxonomy = this._languageData?.taxonomy;
        if (!taxonomy)
            return `[${taxonomyDisplayId}]`;
        // Search through all taxonomy categories
        return taxonomy.domains[taxonomyDisplayId] ??
            taxonomy.kingdoms[taxonomyDisplayId] ??
            taxonomy.phylums[taxonomyDisplayId] ??
            taxonomy.classes[taxonomyDisplayId] ??
            taxonomy.orders[taxonomyDisplayId] ??
            taxonomy.families[taxonomyDisplayId] ??
            taxonomy.genera[taxonomyDisplayId] ??
            taxonomy.species[taxonomyDisplayId] ??
            `[${taxonomyDisplayId}]`;
    }
    hasText(textId) {
        return this.getText(textId) !== `[${textId}]`;
    }
    getText(textId) {
        // This is a fallback method that searches all text categories
        const data = this._languageData;
        if (!data)
            return `[${textId}]`;
        // Optimized search: check each category directly instead of creating a merged object
        // This avoids the overhead of object spreading and is much faster
        // Check cards first (most common)
        if (data.cards.names[textId]) {
            return data.cards.names[textId];
        }
        if (data.cards.scientificNames[textId]) {
            return data.cards.scientificNames[textId];
        }
        if (data.cards.descriptions[textId]) {
            return data.cards.descriptions[textId];
        }
        // Check abilities
        if (data.abilities.names[textId]) {
            return data.abilities.names[textId];
        }
        if (data.abilities.descriptions[textId]) {
            return data.abilities.descriptions[textId];
        }
        if (data.abilities.flavorText && data.abilities.flavorText[textId]) {
            return data.abilities.flavorText[textId];
        }
        // Check UI text
        if (data.ui.gameActions[textId]) {
            return data.ui.gameActions[textId];
        }
        if (data.ui.gamePhases[textId]) {
            return data.ui.gamePhases[textId];
        }
        if (data.ui.gameStates[textId]) {
            return data.ui.gameStates[textId];
        }
        if (data.ui.errorMessages[textId]) {
            return data.ui.errorMessages[textId];
        }
        if (data.ui.gameTerms[textId]) {
            return data.ui.gameTerms[textId];
        }
        if (data.ui.keywords[textId]) {
            return data.ui.keywords[textId];
        }
        if (data.ui.trophicCategories[textId]) {
            return data.ui.trophicCategories[textId];
        }
        return `[${textId}]`;
    }
}
exports.LocalizationManager = LocalizationManager;
/**
 * JSON file-based data loader implementation
 */
class JSONFileDataLoader {
    constructor(basePath = '/data/localization') {
        this.basePath = basePath;
    }
    async loadLanguageData(languageCode) {
        const [cards, abilities, ui, taxonomy] = await Promise.all([
            this.loadJSON(`${this.basePath}/${languageCode}/cards.json`),
            this.loadJSON(`${this.basePath}/${languageCode}/abilities.json`),
            this.loadJSON(`${this.basePath}/${languageCode}/ui.json`),
            this.loadJSON(`${this.basePath}/${languageCode}/taxonomy.json`)
        ]);
        return { cards, abilities, ui, taxonomy };
    }
    async getAvailableLanguages() {
        // Return all supported languages
        return [text_ids_1.SupportedLanguage.ENGLISH, text_ids_1.SupportedLanguage.SPANISH];
    }
    async loadJSON(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.statusText}`);
        }
        return response.json();
    }
}
exports.JSONFileDataLoader = JSONFileDataLoader;
//# sourceMappingURL=localization-manager.js.map