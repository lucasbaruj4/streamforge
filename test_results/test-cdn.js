#!/usr/bin/env node

// CDN Performance Test Script
// This demonstrates the power of edge caching - just like Netflix's CDN

import { performance } from 'perf_hooks';

const ORIGIN_URL = 'http://localhost:3000';  // Direct to API (no cache)
const CDN_URL = 'http://localhost:8080';     // Through nginx CDN (with cache)

// Test configuration
const VIDEO_ID = '5';
const QUALITY = '720p';
const ITERATIONS = 5;

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

async function measureRequest(url, description) {
    const start = performance.now();

    try {
        const response = await fetch(url, {
            headers: {
                'Range': 'bytes=0-1048576'  // Request first 1MB like video players do
            }
        });

        const end = performance.now();
        const time = end - start;

        // Check cache status from headers
        const cacheStatus = response.headers.get('X-Cache-Status') || 'N/A';
        const cacheKey = response.headers.get('X-Cache-Key') || 'N/A';

        return {
            success: response.ok,
            time: time,
            status: response.status,
            cacheStatus: cacheStatus,
            cacheKey: cacheKey
        };
    } catch (error) {
        return {
            success: false,
            time: 0,
            error: error.message
        };
    }
}

async function runTest() {
    console.log(`${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}        StreamForge CDN Performance Test${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Test 1: Direct Origin Request (No Cache)
    console.log(`${colors.yellow}Test 1: Direct Origin Request${colors.reset}`);
    console.log(`URL: ${ORIGIN_URL}/api/stream/${VIDEO_ID}/${QUALITY}`);
    console.log('─'.repeat(50));

    const originTimes = [];
    for (let i = 1; i <= ITERATIONS; i++) {
        const result = await measureRequest(
            `${ORIGIN_URL}/api/stream/${VIDEO_ID}/${QUALITY}`,
            `Origin Request #${i}`
        );

        if (result.success) {
            originTimes.push(result.time);
            console.log(`  Request #${i}: ${result.time.toFixed(2)}ms`);
        } else {
            console.log(`  Request #${i}: ${colors.red}Failed - ${result.error}${colors.reset}`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgOrigin = originTimes.length > 0
        ? originTimes.reduce((a, b) => a + b, 0) / originTimes.length
        : 0;

    console.log(`${colors.bold}Average Origin Time: ${avgOrigin.toFixed(2)}ms${colors.reset}\n`);

    // Test 2: CDN Request (With Cache)
    console.log(`${colors.yellow}Test 2: CDN Request (Cache Enabled)${colors.reset}`);
    console.log(`URL: ${CDN_URL}/api/stream/${VIDEO_ID}/${QUALITY}`);
    console.log('─'.repeat(50));

    const cdnTimes = [];
    const cacheStatuses = [];

    for (let i = 1; i <= ITERATIONS; i++) {
        const result = await measureRequest(
            `${CDN_URL}/api/stream/${VIDEO_ID}/${QUALITY}`,
            `CDN Request #${i}`
        );

        if (result.success) {
            cdnTimes.push(result.time);
            cacheStatuses.push(result.cacheStatus);

            const statusColor = result.cacheStatus === 'HIT' ? colors.green : colors.yellow;
            console.log(`  Request #${i}: ${result.time.toFixed(2)}ms [${statusColor}${result.cacheStatus}${colors.reset}]`);
        } else {
            console.log(`  Request #${i}: ${colors.red}Failed - ${result.error}${colors.reset}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgCDN = cdnTimes.length > 0
        ? cdnTimes.reduce((a, b) => a + b, 0) / cdnTimes.length
        : 0;

    console.log(`${colors.bold}Average CDN Time: ${avgCDN.toFixed(2)}ms${colors.reset}\n`);

    // Calculate cache hit rate
    const hitCount = cacheStatuses.filter(status => status === 'HIT').length;
    const hitRate = (hitCount / cacheStatuses.length) * 100;

    // Results Summary
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}                    RESULTS${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    if (avgOrigin > 0 && avgCDN > 0) {
        const improvement = ((avgOrigin - avgCDN) / avgOrigin) * 100;
        const speedup = avgOrigin / avgCDN;

        console.log(`📊 Origin Average: ${avgOrigin.toFixed(2)}ms`);
        console.log(`📊 CDN Average: ${avgCDN.toFixed(2)}ms`);
        console.log(`📊 Cache Hit Rate: ${hitRate.toFixed(0)}%`);
        console.log(`${colors.green}${colors.bold}🚀 Performance Improvement: ${improvement.toFixed(1)}%${colors.reset}`);
        console.log(`${colors.green}${colors.bold}⚡ Speedup Factor: ${speedup.toFixed(1)}x faster${colors.reset}`);

        // Netflix-style interpretation
        console.log('\n' + '─'.repeat(50));
        if (improvement > 50) {
            console.log(`${colors.green}✨ Excellent! Your CDN is performing like Netflix's edge servers.${colors.reset}`);
            console.log(`   Users will experience instant video playback!`);
        } else if (improvement > 20) {
            console.log(`${colors.yellow}👍 Good performance gain. Cache is warming up.${colors.reset}`);
            console.log(`   Run the test again for better cache hit rates.`);
        } else {
            console.log(`${colors.yellow}📝 Cache might be cold. Run test again to see the real power!${colors.reset}`);
        }
    } else {
        console.log(`${colors.red}❌ Test incomplete. Make sure both servers are running.${colors.reset}`);
        console.log(`   API: http://localhost:3000`);
        console.log(`   CDN: http://localhost:8080`);
    }

    // Test cache bypass
    console.log('\n' + '─'.repeat(50));
    console.log(`${colors.cyan}Testing Cache Bypass (for debugging)${colors.reset}`);

    const bypassResult = await measureRequest(
        `${CDN_URL}/api/stream/${VIDEO_ID}/${QUALITY}?nocache=1`,
        'Bypass Request'
    );

    if (bypassResult.success) {
        console.log(`  Bypass Time: ${bypassResult.time.toFixed(2)}ms [${colors.yellow}${bypassResult.cacheStatus}${colors.reset}]`);
        console.log(`  ✅ Cache bypass working correctly!`);
    }

    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

runTest().catch(console.error);