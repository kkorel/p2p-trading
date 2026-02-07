/**
 * Weather + Solar Heatmap Test
 *
 * Usage:
 *   npx tsx packages/shared/src/weather/test-address.ts "41 Elvaston Pl, South Kensington, London SW7 5NP"
 *   npx tsx packages/shared/src/weather/test-address.ts "10 Downing Street, London"
 *   npx tsx packages/shared/src/weather/test-address.ts "221B Baker Street, London"
 *
 * All output is saved to: packages/shared/test-results/<address-slug>/
 */

// Load env vars FIRST so API keys are available
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true } as any);

import {
    geocodeAddress,
    getWeatherForecast,
    getWeatherAdjustedCapacity,
    findBestTradingWindow,
    getSolarMultiplier,
    getWindMultiplier,
    getHydroMultiplier,
    calculateWeatherMultiplier,
    getWeatherConditionString,
} from './weather-service';
import {
    getMaintenanceAlert,
    extractMaintenanceData,
} from './maintenance-alerts';
import { geocodeWithGoogle, getSolarHeatmap } from '../solar';
import * as fs from 'fs';

// ---- Parse address from command-line args ----
const ADDRESS = process.argv.slice(2).join(' ').trim();
if (!ADDRESS) {
    console.log('Usage: npx tsx test-address.ts "<full street address>"');
    console.log('Example: npx tsx test-address.ts "10 Downing Street, London"');
    process.exit(1);
}

const BASE_CAPACITY = 100; // kWh

// ---- Output directory (derived from address) ----
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
}

const RESULTS_DIR = path.resolve(__dirname, '../../test-results', slugify(ADDRESS));
fs.mkdirSync(RESULTS_DIR, { recursive: true });

// ---- Logging: tee to stdout + log file ----
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(RESULTS_DIR, `test-${timestamp}.log`);
const logLines: string[] = [];

const origLog = console.log.bind(console);
console.log = (...args: any[]) => {
    const line = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    logLines.push(line);
    origLog(...args);
};
// Redirect warn/error to stdout so PowerShell doesn't inject stderr noise
console.warn = (...args: any[]) => console.log('[WARN]', ...args);
console.error = (...args: any[]) => console.log('[ERROR]', ...args);

// ---- Helpers ----

function divider(title: string) {
    const line = '-'.repeat(70);
    console.log(`\n${line}`);
    console.log(`  ${title}`);
    console.log(line);
}

function row(label: string, value: string | number | boolean) {
    console.log(`  ${label.padEnd(35)} ${value}`);
}

async function main() {
    console.log('');
    console.log('========================================================================');
    console.log('   WEATHER + SOLAR HEATMAP TEST');
    console.log('   Address: ' + ADDRESS);
    console.log('   Time:    ' + new Date().toISOString());
    console.log('========================================================================');

    // ----------------------------------------------------------------
    //  1. GEOCODING
    // ----------------------------------------------------------------
    divider('1. GEOCODING');
    let lat: number, lon: number, locationName: string;

    row('Trying', 'Google Geocoder (full street address)');
    const googleResult = await geocodeWithGoogle(ADDRESS);
    if (googleResult) {
        lat = googleResult.lat;
        lon = googleResult.lon;
        locationName = googleResult.formattedAddress;
        row('Status', 'OK (Google)');
        row('Formatted address', locationName);
    } else {
        row('Status', 'FAILED - falling back to Open-Meteo');
        row('Trying', 'Open-Meteo geocoder with address');
        const openMeteoResult = await geocodeAddress(ADDRESS);
        if (!openMeteoResult) {
            row('Status', 'FAILED - both geocoders failed. Exiting.');
            return;
        }
        lat = openMeteoResult.lat;
        lon = openMeteoResult.lon;
        locationName = openMeteoResult.city || ADDRESS;
        row('Status', 'OK (Open-Meteo)');
        row('City', locationName);
    }
    row('Latitude', lat.toFixed(6));
    row('Longitude', lon.toFixed(6));

    // ----------------------------------------------------------------
    //  2. WEATHER FORECAST
    // ----------------------------------------------------------------
    divider('2. WEATHER FORECAST (Open-Meteo)');
    const forecast = await getWeatherForecast(lat, lon);
    if (!forecast) {
        row('Status', 'FAILED to fetch weather. Exiting.');
        return;
    }
    row('Status', 'OK');
    row('Total hours', forecast.hourly.length);
    row('Range start', forecast.hourly[0].time.toISOString());
    row('Range end', forecast.hourly[forecast.hourly.length - 1].time.toISOString());

    console.log('\n  Hourly data (first 12 hours):');
    console.log('  ' + 'Hour'.padEnd(22) + 'Cloud%'.padEnd(9) + 'Wind km/h'.padEnd(12) + 'Precip mm'.padEnd(12) + 'WMO Code');
    console.log('  ' + '-'.repeat(65));
    for (let i = 0; i < Math.min(12, forecast.hourly.length); i++) {
        const h = forecast.hourly[i];
        const time = h.time.toTimeString().slice(0, 5);
        console.log(
            '  ' +
            time.padEnd(22) +
            String(h.cloudCover).padEnd(9) +
            String(h.windSpeed).padEnd(12) +
            String(h.precipitation).padEnd(12) +
            String(h.weatherCode)
        );
    }

    // ----------------------------------------------------------------
    //  3. INDIVIDUAL MULTIPLIER FUNCTIONS
    // ----------------------------------------------------------------
    divider('3. INDIVIDUAL MULTIPLIER FUNCTIONS');

    const now = forecast.hourly[0];
    row('Current cloud cover', now.cloudCover + '%');
    row('Current wind speed', now.windSpeed + ' km/h');

    console.log('\n  Solar multiplier table (cloud cover -> multiplier):');
    for (const cloud of [0, 10, 19, 20, 35, 49, 50, 65, 79, 80, 100]) {
        const mult = getSolarMultiplier(cloud);
        const bar = '#'.repeat(Math.round(mult * 20));
        console.log(`    ${String(cloud).padStart(3)}% cloud -> ${mult.toFixed(2)}  ${bar}`);
    }

    console.log('\n  Wind multiplier table (wind speed -> multiplier):');
    for (const wind of [0, 5, 10, 15, 20, 25, 30, 40, 50]) {
        const mult = getWindMultiplier(wind);
        const bar = '#'.repeat(Math.round(mult * 20));
        console.log(`    ${String(wind).padStart(3)} km/h  -> ${mult.toFixed(2)}  ${bar}`);
    }

    console.log('\n  Hydro multiplier (constant):');
    row('getHydroMultiplier()', getHydroMultiplier());

    console.log('\n  Applied to current conditions:');
    row('getSolarMultiplier(' + now.cloudCover + '%)', getSolarMultiplier(now.cloudCover));
    row('getWindMultiplier(' + now.windSpeed + ' km/h)', getWindMultiplier(now.windSpeed));

    // ----------------------------------------------------------------
    //  4. WEATHER CONDITION STRING
    // ----------------------------------------------------------------
    divider('4. WEATHER CONDITION STRING');

    console.log('  Condition string table:');
    for (const [cloud, wind] of [[10, 5], [30, 10], [50, 20], [70, 30], [90, 50]] as [number, number][]) {
        const cond = getWeatherConditionString(cloud, wind);
        console.log(`    cloud=${String(cloud).padStart(2)}%, wind=${String(wind).padStart(2)} km/h -> "${cond}"`);
    }
    console.log(`\n  Current: "${getWeatherConditionString(now.cloudCover, now.windSpeed)}"`);

    // ----------------------------------------------------------------
    //  5. CALCULATE WEATHER MULTIPLIER (time-window based)
    // ----------------------------------------------------------------
    divider('5. calculateWeatherMultiplier() - time window analysis');

    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + 4 * 60 * 60 * 1000);

    row('Window start', windowStart.toISOString());
    row('Window end', windowEnd.toISOString());

    const solarMult = calculateWeatherMultiplier(forecast, 'SOLAR', windowStart, windowEnd);
    const windMult = calculateWeatherMultiplier(forecast, 'WIND', windowStart, windowEnd);
    const hydroMult = calculateWeatherMultiplier(forecast, 'HYDRO', windowStart, windowEnd);

    row('SOLAR multiplier (4h avg)', solarMult.toFixed(4));
    row('WIND multiplier (4h avg)', windMult.toFixed(4));
    row('HYDRO multiplier (4h avg)', hydroMult.toFixed(4));

    console.log('\n  Capacity impact (base = ' + BASE_CAPACITY + ' kWh):');
    row('SOLAR effective', (BASE_CAPACITY * solarMult).toFixed(1) + ' kWh');
    row('WIND effective', (BASE_CAPACITY * windMult).toFixed(1) + ' kWh');
    row('HYDRO effective', (BASE_CAPACITY * hydroMult).toFixed(1) + ' kWh');

    // ----------------------------------------------------------------
    //  6. FULL PIPELINE - getWeatherAdjustedCapacity
    // ----------------------------------------------------------------
    divider('6. getWeatherAdjustedCapacity() - full pipeline');

    // Pass the resolved city name for Open-Meteo compatibility
    const weatherCity = locationName.split(',')[0].trim();
    row('Address passed', weatherCity);
    row('Base capacity', BASE_CAPACITY + ' kWh');

    for (const sourceType of ['SOLAR', 'WIND', 'HYDRO'] as const) {
        const result = await getWeatherAdjustedCapacity(BASE_CAPACITY, weatherCity, sourceType);
        console.log(`\n  [${sourceType}]`);
        row('  Base capacity', result.baseCapacity + ' kWh');
        row('  Effective capacity', result.effectiveCapacity + ' kWh');
        row('  Implied multiplier', (result.effectiveCapacity / result.baseCapacity).toFixed(4));
        row('  Condition string', '"' + result.condition + '"');
        if (result.bestWindow) {
            row('  Best window', result.bestWindow.start + ' -> ' + result.bestWindow.end);
        } else {
            row('  Best window', 'none');
        }
    }

    // ----------------------------------------------------------------
    //  7. BEST TRADING WINDOWS
    // ----------------------------------------------------------------
    divider('7. findBestTradingWindow() - today');

    const today = new Date();
    row('Date', today.toDateString());
    row('Search range', '06:00 - 18:00 (4-hour windows)');

    for (const sourceType of ['SOLAR', 'WIND', 'HYDRO'] as const) {
        const window = findBestTradingWindow(forecast, sourceType, today);
        if (window) {
            row(sourceType + ' best window', window.start + ' -> ' + window.end);
            row(sourceType + ' window multiplier', window.multiplier.toFixed(4));
        } else {
            row(sourceType + ' best window', 'none found');
        }
    }

    // ----------------------------------------------------------------
    //  8. MAINTENANCE ALERTS
    // ----------------------------------------------------------------
    divider('8. MAINTENANCE ALERTS');

    const maintenanceData = extractMaintenanceData(
        forecast.hourly.map(h => ({
            precipitation: h.precipitation,
            windSpeed: h.windSpeed,
            weatherCode: h.weatherCode,
        })),
        24
    );

    row('Analysis period', 'last 24 hours of forecast');
    row('Total precipitation', maintenanceData.precipitation24h.toFixed(1) + ' mm');
    row('Max wind speed', maintenanceData.maxWindSpeed.toFixed(1) + ' km/h');
    row('Had thunderstorm', maintenanceData.hadThunderstorm);
    row('Had hail', maintenanceData.hadHail);
    row('Heavy rain threshold', '30 mm');
    row('High wind threshold', '50 km/h');

    const alert = getMaintenanceAlert(maintenanceData);
    if (alert) {
        console.log('\n  ALERT TRIGGERED:');
        for (const line of alert.split('\n')) {
            console.log('    ' + line);
        }
    } else {
        row('Alert status', 'No maintenance needed');
    }

    // ----------------------------------------------------------------
    //  9. SOLAR HEATMAP / FLUX MAP
    // ----------------------------------------------------------------
    divider('9. SOLAR HEATMAP / FLUX MAP');

    row('Address', ADDRESS);
    row('Radius', '50m');
    row('API', 'Google Solar API dataLayers:get');

    const heatmap = await getSolarHeatmap(ADDRESS, 50);

    row('Available', heatmap.available);

    if (heatmap.available && heatmap.imageBase64) {
        row('Image dimensions', heatmap.width + ' x ' + heatmap.height + ' px');
        row('Base64 length', heatmap.imageBase64.length + ' chars');

        if (heatmap.fluxStats) {
            row('Min flux', heatmap.fluxStats.minKwhPerM2 + ' kWh/m2/year');
            row('Max flux', heatmap.fluxStats.maxKwhPerM2 + ' kWh/m2/year');
            row('Avg flux', heatmap.fluxStats.avgKwhPerM2 + ' kWh/m2/year');
        }

        if (heatmap.bounds) {
            row('Bounds north', heatmap.bounds.north.toFixed(6));
            row('Bounds south', heatmap.bounds.south.toFixed(6));
            row('Bounds east', heatmap.bounds.east.toFixed(6));
            row('Bounds west', heatmap.bounds.west.toFixed(6));
        }

        // Save the heatmap PNG to the results folder
        const base64Data = heatmap.imageBase64.replace(/^data:image\/png;base64,/, '');
        const heatmapPath = path.join(RESULTS_DIR, 'heatmap.png');
        fs.writeFileSync(heatmapPath, Buffer.from(base64Data, 'base64'));
        row('Saved to', heatmapPath);
    } else {
        row('Error reason', heatmap.errorReason || 'unknown');
        console.log('\n  NOTE: Heatmap requires GOOGLE_SOLAR_API_KEY in .env');
        console.log('  The Solar API dataLayers endpoint is a paid API.');
    }

    // ----------------------------------------------------------------
    //  SUMMARY
    // ----------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('   TEST COMPLETE - All tools executed');
    console.log('   Results saved to: ' + RESULTS_DIR);
    console.log('========================================================================\n');

    // Write the log file
    fs.writeFileSync(logPath, logLines.join('\n'), 'utf-8');
    // Also overwrite a latest.log for easy access
    fs.writeFileSync(path.join(RESULTS_DIR, 'latest.log'), logLines.join('\n'), 'utf-8');
}

main().catch(error => {
    console.error('TEST FAILED:', error);
    process.exit(1);
});
