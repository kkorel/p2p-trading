/**
 * Solar API Service
 * Integrates with Google Solar API and Google Geocoding to analyze installations
 * and calculate initial trading limits based on satellite data.
 */

import { createLogger } from '../utils';
import type {
    SolarAnalysis,
    GoogleSolarBuildingInsights,
    GoogleGeocodingResult,
} from './types';

const logger = createLogger('SolarAPIService');

// API endpoints
const GOOGLE_SOLAR_API = 'https://solar.googleapis.com/v1';
const GOOGLE_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_STATIC_MAPS_API = 'https://maps.googleapis.com/maps/api/staticmap';

// Cache for demo addresses (populated at startup or on-demand)
const analysisCache = new Map<string, SolarAnalysis>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Trading limit thresholds
const THRESHOLDS = {
    HIGH_SUNSHINE: 1800,
    MEDIUM_SUNSHINE: 1500,
    LOW_SUNSHINE: 1200,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 15,
    MIN_LIMIT: 7,
};

/**
 * Geocode an address using Google Geocoding API
 * Better India accuracy than Open-Meteo
 */
export async function geocodeWithGoogle(
    address: string
): Promise<{ lat: number; lon: number; formattedAddress: string } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        logger.warn('GOOGLE_MAPS_API_KEY not set, geocoding will fail');
        return null;
    }

    try {
        const url = `${GOOGLE_GEOCODING_API}?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            logger.warn('Google Geocoding API error', { status: response.status });
            return null;
        }

        const data = await response.json() as GoogleGeocodingResult;

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            logger.warn('No geocoding results', { address, status: data.status });
            return null;
        }

        const result = data.results[0];
        return {
            lat: result.geometry.location.lat,
            lon: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
        };
    } catch (error) {
        logger.error('Geocoding failed', { error, address });
        return null;
    }
}

/**
 * Fetch building insights from Google Solar API
 */
async function fetchBuildingInsights(
    lat: number,
    lon: number
): Promise<GoogleSolarBuildingInsights | null> {
    const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
    if (!apiKey) {
        logger.warn('GOOGLE_SOLAR_API_KEY not set');
        return null;
    }

    try {
        const url = `${GOOGLE_SOLAR_API}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lon}&requiredQuality=MEDIUM&key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                logger.info('No solar data for location', { lat, lon });
                return null;
            }
            logger.warn('Solar API error', { status: response.status });
            return null;
        }

        return await response.json() as GoogleSolarBuildingInsights;
    } catch (error) {
        logger.error('Solar API fetch failed', { error, lat, lon });
        return null;
    }
}

/**
 * Get satellite image URL for an address
 */
export function getSatelliteImageUrl(lat: number, lon: number, zoom: number = 19): string {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return '';

    return `${GOOGLE_STATIC_MAPS_API}?center=${lat},${lon}&zoom=${zoom}&size=400x300&maptype=satellite&key=${apiKey}`;
}

/**
 * Calculate installation score from solar data
 */
function calculateInstallationScore(insights: GoogleSolarBuildingInsights): number {
    const solarPotential = insights.solarPotential;
    if (!solarPotential) return 0.5; // Default neutral score

    let score = 0.5; // Base score

    // Sunshine hours factor (0-0.3)
    const sunshineHours = solarPotential.maxSunshineHoursPerYear || 0;
    if (sunshineHours >= 1800) score += 0.3;
    else if (sunshineHours >= 1500) score += 0.2;
    else if (sunshineHours >= 1200) score += 0.1;

    // Imagery quality factor (0-0.2)
    if (insights.imageryQuality === 'HIGH') score += 0.2;
    else if (insights.imageryQuality === 'MEDIUM') score += 0.1;

    return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Calculate trading limit from installation score
 */
function calculateTradingLimit(sunshineHours: number, imageryQuality: string): number {
    if (sunshineHours >= THRESHOLDS.HIGH_SUNSHINE && imageryQuality === 'HIGH') {
        return THRESHOLDS.MAX_LIMIT; // 15%
    }
    if (sunshineHours >= THRESHOLDS.MEDIUM_SUNSHINE) {
        return 12; // 12%
    }
    if (sunshineHours >= THRESHOLDS.LOW_SUNSHINE) {
        return THRESHOLDS.DEFAULT_LIMIT; // 10%
    }
    return THRESHOLDS.DEFAULT_LIMIT; // 10% default
}

/**
 * Normalize address for cache key
 */
function normalizeAddress(address: string): string {
    return address.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Main function: Analyze an installation address
 * Called during onboarding after VC verification
 */
export async function analyzeInstallation(address: string): Promise<SolarAnalysis> {
    // Check cache first
    const cacheKey = normalizeAddress(address);
    const cached = analysisCache.get(cacheKey);
    if (cached) {
        logger.info('Returning cached analysis', { address });
        return cached;
    }

    try {
        // Step 1: Geocode address
        const coords = await geocodeWithGoogle(address);
        if (!coords) {
            logger.warn('Geocoding failed, using default limit', { address });
            return createDefaultAnalysis('Geocoding failed');
        }

        logger.info('Geocoded address', { address, lat: coords.lat, lon: coords.lon });

        // Step 2: Fetch Solar API data
        const insights = await fetchBuildingInsights(coords.lat, coords.lon);

        if (!insights || !insights.solarPotential) {
            logger.info('No solar data available, using default limit', { address });
            return createDefaultAnalysis('Solar data not available', coords);
        }

        // Step 3: Calculate score and limit
        const solarPotential = insights.solarPotential;
        const sunshineHours = solarPotential.maxSunshineHoursPerYear || 0;
        const imageryQuality = insights.imageryQuality || 'LOW';
        const roofArea = solarPotential.roofSegmentStats?.reduce(
            (sum, seg) => sum + (seg.stats.areaMeters2 || 0),
            0
        ) || 0;

        const score = calculateInstallationScore(insights);
        const tradingLimit = calculateTradingLimit(sunshineHours, imageryQuality);

        // Get best panel config
        const bestConfig = solarPotential.solarPanelConfigs?.reduce(
            (best, config) => (config.yearlyEnergyDcKwh > (best?.yearlyEnergyDcKwh || 0) ? config : best),
            solarPotential.solarPanelConfigs[0]
        );

        const analysis: SolarAnalysis = {
            available: true,
            location: {
                lat: coords.lat,
                lon: coords.lon,
                formattedAddress: coords.formattedAddress,
            },
            maxSunshineHours: sunshineHours,
            maxPanelCount: solarPotential.maxArrayPanelsCount,
            yearlyEnergyKwh: bestConfig?.yearlyEnergyDcKwh,
            roofAreaM2: roofArea,
            imageryQuality: imageryQuality as 'HIGH' | 'MEDIUM' | 'LOW',
            carbonOffsetKg: solarPotential.carbonOffsetFactorKgPerMwh
                ? (bestConfig?.yearlyEnergyDcKwh || 0) * solarPotential.carbonOffsetFactorKgPerMwh / 1000
                : undefined,
            installationScore: score,
            tradingLimitPercent: tradingLimit,
            verificationMethod: 'SOLAR_API',
            analyzedAt: new Date(),
        };

        logger.info('Installation analyzed', {
            address,
            score,
            tradingLimit,
            sunshineHours,
            imageryQuality,
        });

        // Cache the result
        analysisCache.set(cacheKey, analysis);

        return analysis;
    } catch (error: any) {
        logger.error('Analysis failed', { error: error.message, address });
        return createDefaultAnalysis(error.message);
    }
}

/**
 * Create a default analysis when data is unavailable
 */
function createDefaultAnalysis(
    reason: string,
    coords?: { lat: number; lon: number; formattedAddress: string }
): SolarAnalysis {
    return {
        available: false,
        location: coords
            ? { lat: coords.lat, lon: coords.lon, formattedAddress: coords.formattedAddress }
            : undefined,
        installationScore: 0.5,
        tradingLimitPercent: THRESHOLDS.DEFAULT_LIMIT,
        verificationMethod: 'DEFAULT',
        analyzedAt: new Date(),
        errorReason: reason,
    };
}

/**
 * Pre-populate cache for demo addresses (call at startup)
 */
export async function warmupCache(addresses: string[]): Promise<void> {
    logger.info('Warming up satellite analysis cache', { count: addresses.length });

    for (const address of addresses) {
        try {
            await analyzeInstallation(address);
            logger.info('Cached analysis for demo address', { address });
        } catch (error) {
            logger.warn('Failed to cache demo address', { address, error });
        }
    }
}

export { THRESHOLDS };
