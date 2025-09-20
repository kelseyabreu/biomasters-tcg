const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Sort tests to run unit tests first, then integration tests
    const unitTests = [];
    const integrationTests = [];
    const e2eTests = [];
    
    tests.forEach(test => {
      const testPath = test.path;
      if (testPath.includes('integration')) {
        integrationTests.push(test);
      } else if (testPath.includes('e2e')) {
        e2eTests.push(test);
      } else {
        unitTests.push(test);
      }
    });
    
    // Return tests in order: unit -> integration -> e2e
    return [...unitTests, ...integrationTests, ...e2eTests];
  }
}

module.exports = CustomSequencer;
