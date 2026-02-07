/**
 * Solar Analysis Module — Standalone Toolbox
 * 
 * Provides Google Solar API integration for installation analysis and heatmaps.
 * Fully self-contained — only requires `geotiff` and `pngjs` as dependencies.
 * 
 * Usage:
 *   import { analyzeInstallation, getSatelliteImageUrl, getSolarHeatmap } from '@p2p/shared';
 *
 * Required env vars:
 *   GOOGLE_MAPS_API_KEY  — for geocoding + satellite images
 *   GOOGLE_SOLAR_API_KEY — for building insights + data layers
 */

export { analyzeInstallation, getSatelliteImageUrl, geocodeWithGoogle, warmupCache, getSolarHeatmap, THRESHOLDS } from './solar-api';
export { LIMIT_THRESHOLDS } from './types';
export type { SolarAnalysis, GoogleSolarBuildingInsights, HeatmapResult } from './types';

