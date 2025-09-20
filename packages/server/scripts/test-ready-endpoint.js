require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

async function testReadyEndpoint() {
  console.log('🧪 Testing ready endpoint...');

  try {
    // Import the server app
    const { default: app } = require('../dist/server/src/index');
    
    // Start server
    const server = app.listen(3001, () => {
      console.log('✅ Test server started on port 3001');
    });

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a test JWT token
    const testUserId = randomUUID();
    const testToken = jwt.sign(
      {
        uid: testUserId,
        email: `test-${testUserId}@example.com`,
        test_token: true,
        email_verified: true
      },
      'test-secret',
      { expiresIn: '1h' }
    );

    console.log('🔑 Created test token for user:', testUserId);

    // Test 1: Try to call ready endpoint without session (should fail)
    console.log('\n📝 Test 1: Ready endpoint without session');
    try {
      const response = await axios.patch(
        'http://localhost:3001/api/game/sessions/fake-session-id/ready',
        { ready: true },
        {
          headers: {
            'Authorization': `Bearer ${testToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('❌ Unexpected success:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('✅ Expected error:', error.response.status, error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    // Test 2: Check if the route exists at all
    console.log('\n📝 Test 2: Check route existence');
    try {
      const response = await axios.get('http://localhost:3001/api/game/sessions');
      console.log('✅ Game sessions route exists:', response.status);
    } catch (error) {
      if (error.response) {
        console.log('🔍 Game sessions route response:', error.response.status, error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    // Test 3: Check health endpoint
    console.log('\n📝 Test 3: Health endpoint');
    try {
      const response = await axios.get('http://localhost:3001/health');
      console.log('✅ Health endpoint works:', response.status, response.data.status);
    } catch (error) {
      if (error.response) {
        console.log('❌ Health endpoint error:', error.response.status, error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    // Test 4: Check API health endpoint
    console.log('\n📝 Test 4: API Health endpoint');
    try {
      const response = await axios.get('http://localhost:3001/api/health');
      console.log('✅ API Health endpoint works:', response.status);
    } catch (error) {
      if (error.response) {
        console.log('🔍 API Health endpoint response:', error.response.status, error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    console.log('\n🎉 Ready endpoint test completed!');
    
    // Stop server
    server.close();
    console.log('🧹 Test server stopped');

  } catch (error) {
    console.error('❌ Ready endpoint test failed:', error);
  }
}

// Run the test
testReadyEndpoint();
