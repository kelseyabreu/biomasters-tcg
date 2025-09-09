"use strict";
/**
 * BioMasters TCG - Shared Module Index
 *
 * This file exports all shared types and enums for use by both server and client.
 * Import from this file to get access to all shared definitions.
 *
 * Usage:
 * import { CardId, TrophicLevel, CardData, GameState } from '@biomasters/shared';
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxoSpecies = exports.TaxoGenus = exports.TaxoFamily = exports.TaxoOrder = exports.TaxoClass = exports.TaxoPhylum = exports.TaxoKingdom = exports.TaxoDomain = exports.TROPHIC_CONNECTIONS = exports.DOMAIN_COMPATIBILITY = exports.GAME_CONSTANTS = exports.ApiStatus = exports.ValidationError = exports.GameActionType = exports.TurnPhase = exports.GamePhase = exports.ActionId = exports.SelectorId = exports.EffectId = exports.TriggerId = exports.KeywordId = exports.Domain = exports.TrophicCategoryId = exports.TrophicLevel = exports.AbilityId = exports.CardId = exports.TaxonomyMapper = exports.TaxonomyDisplayId = void 0;
// Export all enums
__exportStar(require("./enums"), exports);
// Export all types
__exportStar(require("./types"), exports);
// Export shared utilities
__exportStar(require("./utils/cardIdHelpers"), exports);
__exportStar(require("./data/DataLoader"), exports);
__exportStar(require("./data/DataCache"), exports);
__exportStar(require("./taxonomy-mapping"), exports);
// Export services
__exportStar(require("./services/TaxonomyFilter"), exports);
__exportStar(require("./services/TaxonomyDisplay"), exports);
// Export text IDs and taxonomy mapping
var text_ids_1 = require("./text-ids");
Object.defineProperty(exports, "TaxonomyDisplayId", { enumerable: true, get: function () { return text_ids_1.TaxonomyDisplayId; } });
var taxonomy_mapping_1 = require("./taxonomy-mapping");
Object.defineProperty(exports, "TaxonomyMapper", { enumerable: true, get: function () { return taxonomy_mapping_1.TaxonomyMapper; } });
var enums_1 = require("./enums");
Object.defineProperty(exports, "CardId", { enumerable: true, get: function () { return enums_1.CardId; } });
Object.defineProperty(exports, "AbilityId", { enumerable: true, get: function () { return enums_1.AbilityId; } });
Object.defineProperty(exports, "TrophicLevel", { enumerable: true, get: function () { return enums_1.TrophicLevel; } });
Object.defineProperty(exports, "TrophicCategoryId", { enumerable: true, get: function () { return enums_1.TrophicCategoryId; } });
Object.defineProperty(exports, "Domain", { enumerable: true, get: function () { return enums_1.Domain; } });
Object.defineProperty(exports, "KeywordId", { enumerable: true, get: function () { return enums_1.KeywordId; } });
Object.defineProperty(exports, "TriggerId", { enumerable: true, get: function () { return enums_1.TriggerId; } });
Object.defineProperty(exports, "EffectId", { enumerable: true, get: function () { return enums_1.EffectId; } });
Object.defineProperty(exports, "SelectorId", { enumerable: true, get: function () { return enums_1.SelectorId; } });
Object.defineProperty(exports, "ActionId", { enumerable: true, get: function () { return enums_1.ActionId; } });
Object.defineProperty(exports, "GamePhase", { enumerable: true, get: function () { return enums_1.GamePhase; } });
Object.defineProperty(exports, "TurnPhase", { enumerable: true, get: function () { return enums_1.TurnPhase; } });
Object.defineProperty(exports, "GameActionType", { enumerable: true, get: function () { return enums_1.GameActionType; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return enums_1.ValidationError; } });
Object.defineProperty(exports, "ApiStatus", { enumerable: true, get: function () { return enums_1.ApiStatus; } });
Object.defineProperty(exports, "GAME_CONSTANTS", { enumerable: true, get: function () { return enums_1.GAME_CONSTANTS; } });
Object.defineProperty(exports, "DOMAIN_COMPATIBILITY", { enumerable: true, get: function () { return enums_1.DOMAIN_COMPATIBILITY; } });
Object.defineProperty(exports, "TROPHIC_CONNECTIONS", { enumerable: true, get: function () { return enums_1.TROPHIC_CONNECTIONS; } });
Object.defineProperty(exports, "TaxoDomain", { enumerable: true, get: function () { return enums_1.TaxoDomain; } });
Object.defineProperty(exports, "TaxoKingdom", { enumerable: true, get: function () { return enums_1.TaxoKingdom; } });
Object.defineProperty(exports, "TaxoPhylum", { enumerable: true, get: function () { return enums_1.TaxoPhylum; } });
Object.defineProperty(exports, "TaxoClass", { enumerable: true, get: function () { return enums_1.TaxoClass; } });
Object.defineProperty(exports, "TaxoOrder", { enumerable: true, get: function () { return enums_1.TaxoOrder; } });
Object.defineProperty(exports, "TaxoFamily", { enumerable: true, get: function () { return enums_1.TaxoFamily; } });
Object.defineProperty(exports, "TaxoGenus", { enumerable: true, get: function () { return enums_1.TaxoGenus; } });
Object.defineProperty(exports, "TaxoSpecies", { enumerable: true, get: function () { return enums_1.TaxoSpecies; } });
//# sourceMappingURL=index.js.map