/**
 * Solar API Service - Google Solar API Integration
 * Analyzes installations and calculates initial trading limits (7-15%)
 * based on satellite solar potential data.
 *
 * Usage:
 *   import { analyzeInstallation, getSatelliteImageUrl } from '@p2p/shared';
 *   const analysis = await analyzeInstallation("42 MG Road, Mumbai");
 *   const imageUrl = getSatelliteImageUrl(analysis.location.lat, analysis.location.lon);
 *
 * Required env vars:
 *   GOOGLE_MAPS_API_KEY  - for geocoding + satellite images
 *   GOOGLE_SOLAR_API_KEY - for building insights
 */

import type {
    SolarAnalysis,
    GoogleSolarBuildingInsights,
    GoogleGeocodingResult,
} from './types';

// Inline Logger (no external dependencies for portability)
const logger = {
    info: (msg: string, ctx?: Record<string, any>) =>
        console.log(`[Solar] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    warn: (msg: string, ctx?: Record<string, any>) =>
        console.warn(`[Solar] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
    error: (msg: string, ctx?: Record<string, any>) =>
        console.error(`[Solar] ${msg}`, ctx ? JSON.stringify(ctx) : ''),
};

// API Endpoints
const GOOGLE_SOLAR_API = 'https://solar.googleapis.com/v1';
const GOOGLE_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_STATIC_MAPS_API = 'https://maps.googleapis.com/maps/api/staticmap';

// Cache (24 hour TTL)
const analysisCache = new Map<string, { data: SolarAnalysis; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Trading Limit Thresholds (7-15% range)
export const THRESHOLDS = {
    HIGH_SUNSHINE: 1800,    // hours/year -> 15% limit
    MEDIUM_SUNSHINE: 1500,  // hours/year -> 12% limit
    LOW_SUNSHINE: 1200,     // hours/year -> 10% limit
    DEFAULT_LIMIT: 10,      // % when no data
    MAX_LIMIT: 15,          // % max initial limit
    MIN_LIMIT: 7,           // % min initial limit
};

/**
 * Geocode an address using Google Geocoding API
 */
export async function geocodeWithGoogle(
    address: string
): Promise<{ lat: number; lon: number; formattedAddress: string } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        logger.warn('GOOGLE_MAPS_API_KEY not set, geocoding will fail');
        return null;
    }

    const startTime = Date.now();
    try {
        const url = `${GOOGLE_GEOCODING_API}?address=${encodeURIComponent(address)}&key=${apiKey}`;
        logger.info('Calling Google Geocoding API', { address: address.substring(0, 50) + '...' });

        const response = await fetch(url);
        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
            logger.warn('Google Geocoding API error', { status: response.status, latencyMs });
            return null;
        }

        const data = await response.json() as GoogleGeocodingResult;

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            logger.warn('No geocoding results', { address, status: data.status, latencyMs });
            return null;
        }

        const result = data.results[0];
        logger.info('✓ Google Geocoding API success', {
            latencyMs,
            lat: result.geometry.location.lat.toFixed(4),
            lon: result.geometry.location.lng.toFixed(4),
            formattedAddress: result.formatted_address.substring(0, 60),
        });

        return {
            lat: result.geometry.location.lat,
            lon: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
        };
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        logger.error('Geocoding failed', { error: String(error), address, latencyMs });
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

    const startTime = Date.now();
    try {
        const url = `${GOOGLE_SOLAR_API}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lon}&requiredQuality=MEDIUM&key=${apiKey}`;
        logger.info('Calling Google Solar API', { lat: lat.toFixed(4), lon: lon.toFixed(4) });

        const response = await fetch(url);
        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
            if (response.status === 404) {
                logger.info('No solar data for location (404)', { lat, lon, latencyMs });
                return null;
            }
            logger.warn('Google Solar API error', { status: response.status, latencyMs });
            return null;
        }

        const data = await response.json() as GoogleSolarBuildingInsights;
        const sunshineHours = data.solarPotential?.maxSunshineHoursPerYear || 0;
        const panelCount = data.solarPotential?.maxArrayPanelsCount || 0;

        logger.info('✓ Google Solar API success', {
            latencyMs,
            imageryQuality: data.imageryQuality,
            sunshineHours: Math.round(sunshineHours),
            maxPanels: panelCount,
            hasRoofData: !!data.solarPotential?.roofSegmentStats?.length,
        });

        return data;
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        logger.error('Solar API fetch failed', { error: String(error), lat, lon, latencyMs });
        return null;
    }
}

/**
 * Get satellite image URL for coordinates
 */
export function getSatelliteImageUrl(lat: number, lon: number, zoom: number = 19): string {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return '';

    return `${GOOGLE_STATIC_MAPS_API}?center=${lat},${lon}&zoom=${zoom}&size=400x300&maptype=satellite&key=${apiKey}`;
}

/**
 * Calculate installation score from solar data (0.0 - 1.0)
 */
function calculateInstallationScore(insights: GoogleSolarBuildingInsights): number {
    const solarPotential = insights.solarPotential;
    if (!solarPotential) return 0.5;

    let score = 0.5; // Base

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
 * Calculate trading limit percentage (7-15%)
 * Based on solar potential and imagery quality
 */
function calculateTradingLimit(sunshineHours: number, imageryQuality: string): number {
    // High sunshine + high quality imagery = 15%
    if (sunshineHours >= THRESHOLDS.HIGH_SUNSHINE && imageryQuality === 'HIGH') {
        return THRESHOLDS.MAX_LIMIT; // 15%
    }
    // High sunshine, any quality = 13%
    if (sunshineHours >= THRESHOLDS.HIGH_SUNSHINE) {
        return 13;
    }
    // Medium sunshine = 10-12%
    if (sunshineHours >= THRESHOLDS.MEDIUM_SUNSHINE) {
        return imageryQuality === 'HIGH' ? 12 : 10;
    }
    // Low sunshine = 7-9%
    if (sunshineHours >= THRESHOLDS.LOW_SUNSHINE) {
        return imageryQuality === 'HIGH' ? 9 : THRESHOLDS.MIN_LIMIT;
    }
    // Very low or no data = minimum 7%
    return THRESHOLDS.MIN_LIMIT;
}

function normalizeAddress(address: string): string {
    return address.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Analyze an installation address using Google Solar API.
 * Returns solar analysis with installation score and trading limit (7-15%).
 *
 * @param address - Street address to analyze (e.g. "42 MG Road, Mumbai")
 * @returns SolarAnalysis with score, limit, and solar stats
 */
export async function analyzeInstallation(address: string): Promise<SolarAnalysis> {
    // Check cache first
    const cacheKey = normalizeAddress(address);
    const cached = analysisCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        logger.info('Returning cached analysis', { address });
        return cached.data;
    } else if (cached) {
        analysisCache.delete(cacheKey); // Expired
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
        const rawQuality = insights.imageryQuality || 'LOW';
        const imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW' =
            rawQuality === 'IMAGERY_QUALITY_UNSPECIFIED' ? 'LOW' : rawQuality;
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
            imageryQuality,
            carbonOffsetKg: solarPotential.carbonOffsetFactorKgPerMwh
                ? (bestConfig?.yearlyEnergyDcKwh || 0) * solarPotential.carbonOffsetFactorKgPerMwh / 1000
                : undefined,
            installationScore: score,
            tradingLimitPercent: tradingLimit,
            verificationMethod: 'SOLAR_API',
            analyzedAt: new Date(),
        };

        logger.info('✓ Solar analysis complete', {
            address: address.substring(0, 40),
            score: score.toFixed(2),
            tradingLimit: `${tradingLimit}%`,
            sunshineHours: Math.round(sunshineHours),
            imageryQuality,
            yearlyEnergy: bestConfig?.yearlyEnergyDcKwh ? `${Math.round(bestConfig.yearlyEnergyDcKwh)} kWh` : 'N/A',
        });

        // Cache the result
        analysisCache.set(cacheKey, { data: analysis, expiresAt: Date.now() + CACHE_TTL_MS });

        return analysis;
    } catch (error: any) {
        logger.error('Analysis failed', { error: error.message, address });
        return createDefaultAnalysis(error.message);
    }
}

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
        tradingLimitPercent: THRESHOLDS.DEFAULT_LIMIT, // 10% default
        verificationMethod: 'DEFAULT',
        analyzedAt: new Date(),
        errorReason: reason,
    };
}

/**
 * Pre-populate cache for demo addresses (call at startup)
 */
export async function warmupCache(addresses: string[]): Promise<void> {
    logger.info('Warming up solar analysis cache', { count: addresses.length });

    for (const address of addresses) {
        try {
            await analyzeInstallation(address);
            logger.info('Cached analysis for demo address', { address });
        } catch (error) {
            logger.warn('Failed to cache demo address', { address, error: String(error) });
        }
    }
}
