/**
 * Solar Analysis Module — Standalone Toolbox
 * 
 * Provides Google Solar API integration for installation analysis.
 * Fully self-contained with no external dependencies.
 * 
 * Usage:
 *   import { analyzeInstallation, getSatelliteImageUrl } from '@p2p/shared';
 *
 * Required env vars:
 *   GOOGLE_MAPS_API_KEY  — for geocoding + satellite images
 *   GOOGLE_SOLAR_API_KEY — for building insights
 */

export { analyzeInstallation, getSatelliteImageUrl, geocodeWithGoogle, warmupCache, THRESHOLDS } from './solar-api';
export { LIMIT_THRESHOLDS } from './types';
export type { SolarAnalysis, GoogleSolarBuildingInsights } from './types';
