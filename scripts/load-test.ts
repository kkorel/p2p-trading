#!/usr/bin/env ts-node
/**
 * Load Testing Script for P2P Energy Trading
 * Tests concurrent access patterns and race condition prevention
 * 
 * Usage:
 *   npm run load-test -- --users=100 --blocks=50
 *   npm run load-test -- --help
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuration
interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  blocksPerOffer: number;
  blocksPerRequest: number;
  offerId?: string;
  verbose: boolean;
}

// Results tracking
interface LoadTestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  raceConditionErrors: number;
  timeoutErrors: number;
  totalBlocksClaimed: number;
  totalBlocksRequested: number;
  minResponseTime: number;
  maxResponseTime: number;
  avgResponseTime: number;
  responseTimes: number[];
  startTime: number;
  endTime: number;
  errors: { message: string; count: number }[];
}

// Parse command line arguments
function parseArgs(): LoadTestConfig {
  const args = process.argv.slice(2);
  const config: LoadTestConfig = {
    baseUrl: process.env.BAP_URL || 'http://localhost:4000',
    concurrentUsers: 10,
    blocksPerOffer: 50,
    blocksPerRequest: 5,
    verbose: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
P2P Energy Trading Load Test

Usage:
  npm run load-test -- [options]

Options:
  --users=N         Number of concurrent users (default: 10)
  --blocks=N        Total blocks in the test offer (default: 50)
  --request=N       Blocks requested per user (default: 5)
  --offer=ID        Use existing offer ID instead of creating one
  --url=URL         Base URL (default: http://localhost:4000)
  --verbose         Enable verbose output
  --help            Show this help message

Examples:
  npm run load-test -- --users=100 --blocks=50
  npm run load-test -- --users=50 --offer=offer-alpha-morning
      `);
      process.exit(0);
    }

    const [key, value] = arg.replace(/^--/, '').split('=');
    switch (key) {
      case 'users':
        config.concurrentUsers = parseInt(value, 10);
        break;
      case 'blocks':
        config.blocksPerOffer = parseInt(value, 10);
        break;
      case 'request':
        config.blocksPerRequest = parseInt(value, 10);
        break;
      case 'offer':
        config.offerId = value;
        break;
      case 'url':
        config.baseUrl = value;
        break;
      case 'verbose':
        config.verbose = true;
        break;
    }
  }

  return config;
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Check if services are running
async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
    return response.data.status === 'ok';
  } catch {
    return false;
  }
}

// Get tomorrow's date string for time windows that match seeded offers
function getTomorrowDateStr(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Full flow: discover → select → init
async function runPurchaseFlow(
  config: LoadTestConfig,
  userId: number
): Promise<{ success: boolean; blocksClaimed: number; responseTime: number; error?: string }> {
  const startTime = Date.now();
  const transactionId = uuidv4();
  
  // Use time window that matches seeded offers (tomorrow 10:00-18:00)
  const dateStr = getTomorrowDateStr();
  const requestedTimeWindow = {
    startTime: `${dateStr}T10:00:00Z`,
    endTime: `${dateStr}T18:00:00Z`,
  };
  
  try {
    // Step 1: Discover
    const discoverResponse = await axios.post(`${config.baseUrl}/api/discover`, {
      sourceType: 'SOLAR',
      minQuantity: 1,
    }, { timeout: 10000 });
    
    if (discoverResponse.data.status !== 'ok') {
      throw new Error('Discover failed');
    }
    
    const txnId = discoverResponse.data.transaction_id;
    
    // Wait for catalog to be received (poll until ready or timeout)
    let catalogReady = false;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 150));
      try {
        const stateCheck = await axios.get(`${config.baseUrl}/api/transactions/${txnId}`, { timeout: 2000 });
        // Catalog structure: { providers: [{ items: [{ offers: [...] }] }] }
        const providers = stateCheck.data.catalog?.providers;
        if (providers && providers.length > 0 && providers[0].items?.[0]?.offers?.length > 0) {
          catalogReady = true;
          break;
        }
      } catch {
        // Continue waiting
      }
    }
    
    if (!catalogReady) {
      throw new Error('Catalog not received in time');
    }
    
    // Step 2: Select with specific quantity
    const selectResponse = await axios.post(`${config.baseUrl}/api/select`, {
      transaction_id: txnId,
      quantity: config.blocksPerRequest,
      autoMatch: true,
      requestedTimeWindow,
    }, { timeout: 10000 });
    
    if (selectResponse.data.status !== 'ok') {
      throw new Error('Select failed');
    }
    
    // Wait for callback
    await new Promise(r => setTimeout(r, 200));
    
    // Step 3: Init
    const initResponse = await axios.post(`${config.baseUrl}/api/init`, {
      transaction_id: txnId,
    }, { timeout: 10000 });
    
    if (initResponse.data.status !== 'ok') {
      throw new Error('Init failed');
    }
    
    // Wait for callback
    await new Promise(r => setTimeout(r, 300));
    
    // Check transaction state
    const stateResponse = await axios.get(`${config.baseUrl}/api/transactions/${txnId}`, { timeout: 5000 });
    
    const responseTime = Date.now() - startTime;
    const order = stateResponse.data.order;
    const blocksClaimed = order?.quote?.totalQuantity || 0;
    
    return {
      success: true,
      blocksClaimed,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error.response?.data?.error || error.message;
    
    // Classify error types
    let errorType = errorMessage;
    if (errorMessage.includes('Insufficient') || errorMessage.includes('not enough')) {
      errorType = 'INSUFFICIENT_BLOCKS';
    } else if (errorMessage.includes('timeout') || error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT';
    } else if (errorMessage.includes('lock') || errorMessage.includes('conflict')) {
      errorType = 'LOCK_CONFLICT';
    }
    
    return {
      success: false,
      blocksClaimed: 0,
      responseTime,
      error: errorType,
    };
  }
}

// Main load test function
async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
  log('\n╔═══════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║           P2P Energy Trading - Load Test                      ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════╝\n', colors.cyan);
  
  log(`Configuration:`, colors.bright);
  log(`  Base URL: ${config.baseUrl}`);
  log(`  Concurrent Users: ${config.concurrentUsers}`);
  log(`  Blocks per Request: ${config.blocksPerRequest}`);
  log(`  Verbose: ${config.verbose}`);
  log('');
  
  // Check service health
  log('Checking service health...', colors.yellow);
  const healthy = await checkHealth(config.baseUrl);
  if (!healthy) {
    log('Service is not healthy. Make sure the server is running.', colors.red);
    process.exit(1);
  }
  log('Service is healthy ✓\n', colors.green);
  
  // Initialize results
  const results: LoadTestResults = {
    totalRequests: config.concurrentUsers,
    successfulRequests: 0,
    failedRequests: 0,
    raceConditionErrors: 0,
    timeoutErrors: 0,
    totalBlocksClaimed: 0,
    totalBlocksRequested: config.concurrentUsers * config.blocksPerRequest,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    avgResponseTime: 0,
    responseTimes: [],
    startTime: Date.now(),
    endTime: 0,
    errors: [],
  };
  
  // Run concurrent requests
  log(`Starting ${config.concurrentUsers} concurrent purchase flows...\n`, colors.yellow);
  
  const promises = Array.from({ length: config.concurrentUsers }, (_, i) => 
    runPurchaseFlow(config, i)
  );
  
  const outcomes = await Promise.all(promises);
  results.endTime = Date.now();
  
  // Process results
  const errorCounts: Record<string, number> = {};
  
  for (const outcome of outcomes) {
    results.responseTimes.push(outcome.responseTime);
    results.minResponseTime = Math.min(results.minResponseTime, outcome.responseTime);
    results.maxResponseTime = Math.max(results.maxResponseTime, outcome.responseTime);
    
    if (outcome.success) {
      results.successfulRequests++;
      results.totalBlocksClaimed += outcome.blocksClaimed;
    } else {
      results.failedRequests++;
      
      if (outcome.error) {
        errorCounts[outcome.error] = (errorCounts[outcome.error] || 0) + 1;
        
        if (outcome.error === 'LOCK_CONFLICT' || outcome.error.includes('race')) {
          results.raceConditionErrors++;
        } else if (outcome.error === 'TIMEOUT') {
          results.timeoutErrors++;
        }
      }
      
      if (config.verbose && outcome.error) {
        log(`  User failed: ${outcome.error}`, colors.red);
      }
    }
  }
  
  results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  results.errors = Object.entries(errorCounts).map(([message, count]) => ({ message, count }));
  
  return results;
}

// Print results
function printResults(results: LoadTestResults, config: LoadTestConfig) {
  const totalTime = results.endTime - results.startTime;
  const requestsPerSecond = (results.totalRequests / totalTime) * 1000;
  
  log('\n╔═══════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                       Test Results                            ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════╝\n', colors.cyan);
  
  log('Request Statistics:', colors.bright);
  log(`  Total Requests:     ${results.totalRequests}`);
  log(`  Successful:         ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)`);
  log(`  Failed:             ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(1)}%)`);
  log('');
  
  log('Block Statistics:', colors.bright);
  log(`  Blocks Requested:   ${results.totalBlocksRequested}`);
  log(`  Blocks Claimed:     ${results.totalBlocksClaimed}`);
  log(`  Efficiency:         ${((results.totalBlocksClaimed / results.totalBlocksRequested) * 100).toFixed(1)}%`);
  log('');
  
  log('Timing:', colors.bright);
  log(`  Total Time:         ${totalTime}ms`);
  log(`  Min Response:       ${results.minResponseTime}ms`);
  log(`  Max Response:       ${results.maxResponseTime}ms`);
  log(`  Avg Response:       ${results.avgResponseTime.toFixed(1)}ms`);
  log(`  Throughput:         ${requestsPerSecond.toFixed(2)} req/s`);
  log('');
  
  if (results.errors.length > 0) {
    log('Errors:', colors.bright);
    for (const error of results.errors.sort((a, b) => b.count - a.count)) {
      const color = error.message === 'INSUFFICIENT_BLOCKS' ? colors.yellow : colors.red;
      log(`  ${error.message}: ${error.count}`, color);
    }
    log('');
  }
  
  // Race condition check
  log('Concurrency Safety:', colors.bright);
  if (results.raceConditionErrors === 0) {
    log(`  ✓ No race condition errors detected`, colors.green);
  } else {
    log(`  ✗ Race condition errors: ${results.raceConditionErrors}`, colors.red);
  }
  
  // Overselling check
  if (results.totalBlocksClaimed <= config.blocksPerOffer) {
    log(`  ✓ No overselling detected (claimed ${results.totalBlocksClaimed} <= ${config.blocksPerOffer} available)`, colors.green);
  } else {
    log(`  ✗ OVERSELLING DETECTED: ${results.totalBlocksClaimed} claimed > ${config.blocksPerOffer} available`, colors.red);
  }
  
  log('');
  
  // Overall result
  const passed = results.raceConditionErrors === 0 && results.totalBlocksClaimed <= config.blocksPerOffer;
  if (passed) {
    log('╔═══════════════════════════════════════════════════════════════╗', colors.green);
    log('║                    TEST PASSED ✓                              ║', colors.green);
    log('╚═══════════════════════════════════════════════════════════════╝', colors.green);
  } else {
    log('╔═══════════════════════════════════════════════════════════════╗', colors.red);
    log('║                    TEST FAILED ✗                              ║', colors.red);
    log('╚═══════════════════════════════════════════════════════════════╝', colors.red);
  }
  log('');
}

// Main execution
async function main() {
  const config = parseArgs();
  
  try {
    const results = await runLoadTest(config);
    printResults(results, config);
    
    // Exit with error code if test failed
    const passed = results.raceConditionErrors === 0 && results.totalBlocksClaimed <= config.blocksPerOffer;
    process.exit(passed ? 0 : 1);
  } catch (error: any) {
    log(`\nLoad test failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();
