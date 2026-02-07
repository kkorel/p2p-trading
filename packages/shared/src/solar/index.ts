/**
 * Solar Analysis Module - Google Solar API Integration
 *
 * Provides solar potential analysis for installations based on satellite data.
 * Used during onboarding to calculate initial trading limits (7-15%).
 *
 * Usage:
 *   import { analyzeInstallation, getSatelliteImageUrl } from '@p2p/shared';
 *   const analysis = await analyzeInstallation("42 MG Road, Mumbai");
 *   const imageUrl = getSatelliteImageUrl(19.0760, 72.8777);
 *
 * Required env vars:
 *   GOOGLE_MAPS_API_KEY  - for geocoding + satellite images
 *   GOOGLE_SOLAR_API_KEY - for building insights
 */

export {
    analyzeInstallation,
    getSatelliteImageUrl,
    geocodeWithGoogle,
    warmupCache,
    THRESHOLDS,
} from './solar-api';

export { LIMIT_THRESHOLDS } from './types';

export type { SolarAnalysis, GoogleSolarBuildingInsights } from './types';
