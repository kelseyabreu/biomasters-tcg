#!/usr/bin/env node

/**
 * Run all manual tests
 * This script runs all the manual test scripts in sequence
 */

const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 Running ${scriptName}...`);
        console.log(`${'='.repeat(60)}\n`);

        const scriptPath = path.join(__dirname, scriptName);
        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${scriptName} completed successfully`);
                resolve();
            } else {
                console.log(`\n❌ ${scriptName} failed with code ${code}`);
                reject(new Error(`${scriptName} failed`));
            }
        });

        child.on('error', (error) => {
            console.error(`\n❌ Failed to start ${scriptName}:`, error);
            reject(error);
        });
    });
}

async function runAllTests() {
    console.log('🧪 Running all manual tests...\n');

    const tests = [
        'test-database.js',
        'test-redis-namespace.js',
        'test-api-endpoints.js',
        'test-matchmaking-flow.js'
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            await runScript(test);
            passed++;
        } catch (error) {
            console.error(`Test ${test} failed:`, error.message);
            failed++;
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 TEST SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
        console.log('\n⚠️ Some tests failed. Check the output above for details.');
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
    }
}

// Run all tests
runAllTests().catch(console.error);
