/**
 * Satellite Analysis Module
 * Exports Google Solar API integration for installation verification
 */

export { analyzeInstallation, getSatelliteImageUrl, geocodeWithGoogle, warmupCache, THRESHOLDS } from './solar-api';
export { LIMIT_THRESHOLDS } from './types';
export type { SolarAnalysis, GoogleSolarBuildingInsights } from './types';
