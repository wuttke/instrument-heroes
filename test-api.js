const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const TEST_DATA_FILE = path.join(__dirname, "test-data.json");

async function runApiTests() {
  console.log("🎸 Running Instrument Heroes API Tests\n");
  
  // Clean up test data file
  if (fs.existsSync(TEST_DATA_FILE)) {
    fs.unlinkSync(TEST_DATA_FILE);
  }
  
  let server;
  try {
    server = await startTestServer();
    await runTests();
    console.log("✅ All API tests passed!");
  } catch (error) {
    console.error("❌ API test failed:", error.message);
    process.exit(1);
  } finally {
    if (server) {
      server.kill();
    }
    // Clean up test data file
    if (fs.existsSync(TEST_DATA_FILE)) {
      fs.unlinkSync(TEST_DATA_FILE);
    }
  }
}

function startTestServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: TEST_PORT,
      STORAGE_TYPE: "file",
      DATA_FILE: TEST_DATA_FILE
    };
    
    const server = spawn('node', ['server.js'], { env });
    
    let started = false;
    
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server running') && !started) {
        started = true;
        setTimeout(() => resolve(server), 100); // Give server time to fully start
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`);
    });
    
    server.on('error', (error) => {
      if (!started) {
        reject(new Error(`Failed to start server: ${error.message}`));
      }
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error('Server failed to start within 5 seconds'));
      }
    }, 5000);
  });
}

async function runTests() {
  console.log("📡 Testing API endpoints...");
  
  // Test POST /api/practice
  console.log("  Testing POST /api/practice...");
  await testPostPractice();
  
  // Test GET /api/practice
  console.log("  Testing GET /api/practice...");
  await testGetPractice();
  
  // Test error cases
  console.log("  Testing error cases...");
  await testErrorCases();
  
  console.log("✅ API tests completed\n");
}

async function testPostPractice() {
  // Test successful POST
  const response1 = await makeRequest('POST', '/api/practice', { name: 'piano' });
  if (response1.statusCode !== 201) {
    throw new Error(`Expected 201, got ${response1.statusCode}: ${response1.body}`);
  }
  
  const data1 = JSON.parse(response1.body);
  if (!data1.date || data1.name !== 'piano') {
    throw new Error(`Unexpected response: ${response1.body}`);
  }
  
  // Test duplicate instrument (should return 409)
  const response2 = await makeRequest('POST', '/api/practice', { name: 'piano' });
  if (response2.statusCode !== 409) {
    throw new Error(`Expected 409 for duplicate, got ${response2.statusCode}: ${response2.body}`);
  }
  
  // Test missing name (should return 400)
  const response3 = await makeRequest('POST', '/api/practice', {});
  if (response3.statusCode !== 400) {
    throw new Error(`Expected 400 for missing name, got ${response3.statusCode}: ${response3.body}`);
  }
}

async function testGetPractice() {
  // Add some test data first
  await makeRequest('POST', '/api/practice', { name: 'guitar' });
  await makeRequest('POST', '/api/practice', { name: 'drums' });
  
  const today = new Date().toISOString().split('T')[0];
  const response = await makeRequest('GET', `/api/practice?start=${today}&end=${today}`);
  
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}: ${response.body}`);
  }
  
  const data = JSON.parse(response.body);
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error(`Expected array with at least 2 items, got: ${response.body}`);
  }
  
  // Check that we have our instruments
  const instruments = data.map(item => item.name).sort();
  const expected = ['drums', 'guitar', 'piano'];
  if (JSON.stringify(instruments) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${expected}, got ${instruments}`);
  }
}

async function testErrorCases() {
  // Test GET without required parameters
  const response1 = await makeRequest('GET', '/api/practice');
  if (response1.statusCode !== 400) {
    throw new Error(`Expected 400 for missing params, got ${response1.statusCode}: ${response1.body}`);
  }
  
  // Test GET with only start parameter
  const response2 = await makeRequest('GET', '/api/practice?start=2025-01-01');
  if (response2.statusCode !== 400) {
    throw new Error(`Expected 400 for missing end param, got ${response2.statusCode}: ${response2.body}`);
  }
  
  // Test GET with invalid date format
  const response3 = await makeRequest('GET', '/api/practice?start=invalid&end=2025-01-01');
  if (response3.statusCode !== 500) {
    throw new Error(`Expected 500 for invalid date, got ${response3.statusCode}: ${response3.body}`);
  }
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

if (require.main === module) {
  runApiTests();
}

module.exports = { runApiTests };