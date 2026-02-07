/**
 * Live Test Script for Weather Tools
 * Run with: npx ts-node packages/shared/src/weather/test-live.ts
 */

import {
    geocodeAddress,
    getWeatherForecast,
    getWeatherAdjustedCapacity,
    findBestTradingWindow,
    getSolarMultiplier,
    getWindMultiplier,
} from './weather-service';
import {
    getMaintenanceAlert,
    extractMaintenanceData,
} from './maintenance-alerts';

// Test addresses - use simple city names for best geocoding results
const TEST_ADDRESSES = [
    'Bangalore',
    'Mumbai',
    'Chennai',
    'Delhi',
    'South Kensington',
    'Berlin',
];

async function testAddress(address: string, baseCapacity: number = 100) {
    console.log('\n' + '='.repeat(60));
    console.log(`📍 Testing: ${address}`);
    console.log('='.repeat(60));

    // Step 1: Geocode
    const location = await geocodeAddress(address);
    if (!location) {
        console.log('❌ Failed to geocode address');
        return;
    }
    console.log(`✅ Geocoded: ${location.city} (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})`);

    // Step 2: Get forecast
    const forecast = await getWeatherForecast(location.lat, location.lon);
    if (!forecast) {
        console.log('❌ Failed to fetch weather');
        return;
    }
    console.log(`✅ Forecast fetched: ${forecast.hourly.length} hours of data`);

    // Step 3: Current conditions (first hour)
    const now = forecast.hourly[0];
    console.log(`\n🌡️ Current Conditions:`);
    console.log(`   Cloud Cover: ${now.cloudCover}%`);
    console.log(`   Wind Speed: ${now.windSpeed} km/h`);
    console.log(`   Precipitation: ${now.precipitation} mm`);

    // Step 4: Test SOLAR capacity
    console.log(`\n☀️ SOLAR Analysis:`);
    const solarResult = await getWeatherAdjustedCapacity(baseCapacity, address, 'SOLAR');
    console.log(`   Base Capacity: ${solarResult.baseCapacity} kWh`);
    console.log(`   Multiplier: ${getSolarMultiplier(now.cloudCover)}`);
    console.log(`   Effective Capacity: ${solarResult.effectiveCapacity} kWh`);
    console.log(`   Condition: ${solarResult.condition}`);
    if (solarResult.bestWindow) {
        console.log(`   Best Window: ${solarResult.bestWindow.start} - ${solarResult.bestWindow.end}`);
    }

    // Step 5: Test WIND capacity
    console.log(`\n💨 WIND Analysis:`);
    const windResult = await getWeatherAdjustedCapacity(baseCapacity, address, 'WIND');
    console.log(`   Base Capacity: ${windResult.baseCapacity} kWh`);
    console.log(`   Multiplier: ${getWindMultiplier(now.windSpeed)}`);
    console.log(`   Effective Capacity: ${windResult.effectiveCapacity} kWh`);
    console.log(`   Condition: ${windResult.condition}`);

    // Step 6: Check maintenance alerts
    console.log(`\n⚠️ Maintenance Alert Check:`);
    const maintenanceData = extractMaintenanceData(
        forecast.hourly.map(h => ({
            precipitation: h.precipitation,
            windSpeed: h.windSpeed,
            weatherCode: h.weatherCode,
        })),
        24
    );
    console.log(`   24h Precipitation: ${maintenanceData.precipitation24h.toFixed(1)} mm`);
    console.log(`   Max Wind Speed: ${maintenanceData.maxWindSpeed.toFixed(1)} km/h`);
    console.log(`   Had Thunderstorm: ${maintenanceData.hadThunderstorm}`);
    console.log(`   Had Hail: ${maintenanceData.hadHail}`);

    const alert = getMaintenanceAlert(maintenanceData);
    if (alert) {
        console.log(`   🚨 ALERT: ${alert.split('\n')[0]}`);
    } else {
        console.log(`   ✅ No maintenance needed`);
    }

    // Step 7: Best trading window
    console.log(`\n📊 Best Trading Windows (Today):`);
    const solarWindow = findBestTradingWindow(forecast, 'SOLAR', new Date());
    const windWindow = findBestTradingWindow(forecast, 'WIND', new Date());

    if (solarWindow) {
        console.log(`   SOLAR: ${solarWindow.start} - ${solarWindow.end} (multiplier: ${solarWindow.multiplier.toFixed(2)})`);
    }
    if (windWindow) {
        console.log(`   WIND: ${windWindow.start} - ${windWindow.end} (multiplier: ${windWindow.multiplier.toFixed(2)})`);
    }
}

async function main() {
    console.log('🌤️ Weather Tools Live Test');
    console.log('Testing with real Open-Meteo data...\n');

    // Test all addresses
    for (const address of TEST_ADDRESSES) {
        await testAddress(address, 100); // 100 kWh base capacity
        // Small delay to be nice to the API
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ Live test complete!');
    console.log('='.repeat(60));
}

main().catch(console.error);
