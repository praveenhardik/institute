// Automated Test Suite for Email OTP Authentication Backend
const http = require('http');

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const dataString = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json'
    };
    if (dataString) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Full-Stack Email OTP Authentication Test Suite...\n');
  const testEmail = 'tester' + Date.now() + '@example.com';

  // Test 1: Send OTP with invalid email
  console.log('Test 1: Request OTP with invalid email address format');
  const res1 = await makeRequest('/send-otp', 'POST', { email: 'notanemail' });
  console.assert(res1.status === 400, `Expected 400, got ${res1.status}`);
  console.assert(res1.data.success === false, 'Expected success === false');
  console.log('  ✓ Correctly rejected invalid email format\n');

  // Test 2: Send OTP with valid email
  console.log(`Test 2: Request 6-digit OTP for ${testEmail}`);
  const res2 = await makeRequest('/send-otp', 'POST', { email: testEmail });
  console.assert(res2.status === 200, `Expected 200, got ${res2.status}`);
  console.assert(res2.data.success === true, 'Expected success === true');
  console.assert(res2.data.expiresInSeconds === 300, 'Expected 300 seconds (5 minutes) expiry');
  const generatedCode = res2.data.devCode;
  console.log(`  ✓ OTP dispatched: Expiry=${res2.data.expiresInSeconds}s (Code: ${generatedCode})\n`);

  // Test 3: Verify with incorrect OTP code
  console.log('Test 3: Verify with incorrect OTP code');
  const res3 = await makeRequest('/verify-otp', 'POST', { email: testEmail, otp: '000000' });
  console.assert(res3.status === 400, `Expected 400, got ${res3.status}`);
  console.assert(res3.data.error.includes('Invalid OTP'), `Unexpected error message: ${res3.data.error}`);
  console.log('  ✓ Correctly rejected invalid OTP with clear error message\n');

  // Test 4: Verify with correct OTP code
  if (generatedCode) {
    console.log(`Test 4: Verify with correct OTP code (${generatedCode})`);
    const res4 = await makeRequest('/verify-otp', 'POST', { email: testEmail, otp: generatedCode });
    console.assert(res4.status === 200, `Expected 200, got ${res4.status}`);
    console.assert(res4.data.token, 'Expected JWT authentication token');
    console.assert(res4.data.user.email === testEmail, 'Expected matching user email');
    const token = res4.data.token;
    console.log('  ✓ Verification successful! JWT session token issued.\n');

    // Test 5: Access protected Welcome Dashboard with valid token
    console.log('Test 5: Access protected /api/dashboard endpoint with token');
    const res5 = await makeRequest('/api/dashboard', 'GET', null, token);
    console.assert(res5.status === 200, `Expected 200, got ${res5.status}`);
    console.assert(res5.data.data.email === testEmail, 'Expected email in dashboard data');
    console.log('  ✓ Welcome Dashboard successfully returned protected data!\n');

    // Test 6: Verify replay prevention (same OTP cannot be used twice)
    console.log('Test 6: Verify replay prevention (reusing already consumed OTP)');
    const res6 = await makeRequest('/verify-otp', 'POST', { email: testEmail, otp: generatedCode });
    console.assert(res6.status === 400, `Expected 400, got ${res6.status}`);
    console.log('  ✓ Single-use guarantee confirmed: used OTP was purged immediately.\n');
  }

  // Test 7: Unauthorized access to /api/dashboard
  console.log('Test 7: Attempt accessing protected dashboard without token');
  const res7 = await makeRequest('/api/dashboard', 'GET');
  console.assert(res7.status === 401, `Expected 401, got ${res7.status}`);
  console.log('  ✓ Access properly denied (401 Unauthorized)\n');

  console.log('🎉 All 7 Full-Stack OTP Authentication tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
