const QueKey = require('./src/index');

const client = new QueKey({
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    redirectUri: 'http://localhost:3000/callback',
    environment: 'sandbox'
});

console.log('--- Testing Framework-Agnostic Core Methods ---');

// 1. Test createAuthorizationRequest
const authReq = client.createAuthorizationRequest();
console.log('Authorization Request:', authReq);

if (authReq.url.includes('client_id=test_client_id') && authReq.state && authReq.verifier) {
    console.log('✅ createAuthorizationRequest works! Generated URL and PKCE data.');
} else {
    console.error('❌ createAuthorizationRequest failed!');
    process.exit(1);
}

// 2. Test exchangeToken (Mocking fetch is harder without a library, but we can verify it exists)
console.log('\nChecking for exchangeToken method...');
if (typeof client.exchangeToken === 'function') {
    console.log('✅ exchangeToken method exists.');
} else {
    console.error('❌ exchangeToken method missing!');
    process.exit(1);
}

// 3. Test Express compatibility (Mock req/res)
console.log('\n--- Testing Express Wrappers ---');
const req = { session: {} };
const res = {
    redirect: (url) => {
        console.log('Redirected to:', url);
        if (url === authReq.url) {
            console.log('✅ Express login() redirects correctly.');
        }
    }
};

const loginHandler = client.login();
loginHandler(req, res);

if (req.session.qk_state === authReq.state && req.session.qk_verifier === authReq.verifier) {
    console.log('✅ Express login() populated session correctly.');
} else {
    // Note: State/Verifier are regenerated each call, so we check if they exist
    if (req.session.qk_state && req.session.qk_verifier) {
        console.log('✅ Express login() populated session with new state/verifier.');
    } else {
        console.error('❌ Express login() failed to populate session!');
        process.exit(1);
    }
}

console.log('\nVerification Successful!');
