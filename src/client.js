/**
 * Copyright (c) 2026 GeneralQuery Technologies Pvt. Ltd.
 * Licensed under the MIT License.
 */

const crypto = require('crypto');

/**
 * QueKey Node.js SDK — Core Client
 * Handles the complete server-side OAuth2 + PKCE flow.
 * The frontend never touches auth URLs or tokens.
 */
class QueKeyClient {
    /**
     * @param {Object} options
     * @param {string} options.clientId       — Your QueKey Client ID
     * @param {string} options.clientSecret   — Your QueKey Client Secret
     * @param {string} options.redirectUri     — YOUR backend callback URL (e.g. http://localhost:4000/auth/quekey/callback)
     * @param {string} options.redirectUri     — YOUR backend callback URL (e.g. http://localhost:4000/auth/quekey/callback)
     * @param {'sandbox' | 'live'} [options.environment] — Which QueKey environment to use (default: 'live')
     * @param {string} [options.authServerUrl] — Optional override for custom deployments
     * @param {string} [options.successRedirect] — Where to send the user after successful auth (default: /)
     * @param {string} [options.failureRedirect] — Where to send the user on failure (default: /login)
     */
    constructor(options = {}) {
        if (!options.clientId) throw new Error('QueKey SDK: clientId is required');
        if (!options.clientSecret) throw new Error('QueKey SDK: clientSecret is required');
        if (!options.redirectUri) throw new Error('QueKey SDK: redirectUri is required');

        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.redirectUri = options.redirectUri;
        const ENVIRONMENTS = {
            sandbox: 'https://sandbox.quekey.io/iaf',
            live: 'https://app.quekey.io/iaf'
        };

        const envKey = options.environment === 'sandbox' ? 'sandbox' : 'live';
        this.authServerUrl = (options.authServerUrl || ENVIRONMENTS[envKey]).replace(/\/$/, '');
        this.successRedirect = options.successRedirect || '/';
        this.failureRedirect = options.failureRedirect || '/login';
        this.onSuccess = options.onSuccess || null;
    }

    // ── PKCE Helpers ──────────────────────────────────────────────
    static generateVerifier() {
        return crypto.randomBytes(32).toString('hex');
    }

    static generateChallenge(verifier) {
        return crypto.createHash('sha256').update(verifier).digest('base64url');
    }

    // ── Step 1: Redirect user to QueKey ───────────────────────────
    /**
     * Express route handler: GET /auth/quekey
     * Generates PKCE pair, stores in session, redirects to QueKey.
     */
    login() {
        return (req, res) => {
            const state = crypto.randomBytes(16).toString('hex');
            const verifier = QueKeyClient.generateVerifier();
            const challenge = QueKeyClient.generateChallenge(verifier);

            // Persist in session so callback can verify
            req.session.qk_state = state;
            req.session.qk_verifier = verifier;

            const params = new URLSearchParams({
                response_type: 'code',
                client_id: this.clientId,
                redirect_uri: this.redirectUri,
                state,
                code_challenge: challenge,
                code_challenge_method: 'S256'
            });

            const authorizeUrl = `${this.authServerUrl}/oauth/authorize?${params.toString()}`;
            res.redirect(authorizeUrl);
        };
    }

    // ── Step 2: Handle QueKey callback ────────────────────────────
    /**
     * Express route handler: GET /auth/quekey/callback
     * Validates state, exchanges code for token, fetches user, sets session.
     */
    callback() {
        return async (req, res) => {
            const { code, state, error } = req.query;

            // Auth server returned an error
            if (error) {
                console.error('[QueKey SDK] Auth error:', error);
                return res.redirect(this.failureRedirect);
            }

            // CSRF check
            if (!req.session.qk_state || req.session.qk_state !== state) {
                console.error('[QueKey SDK] State mismatch — possible CSRF');
                return res.redirect(this.failureRedirect);
            }

            const verifier = req.session.qk_verifier;

            // Cleanup temporary session data
            delete req.session.qk_state;
            delete req.session.qk_verifier;

            try {
                // ── Token Exchange ──
                const response = await fetch(`${this.authServerUrl}/oauth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        code,
                        redirect_uri: this.redirectUri,
                        code_verifier: verifier
                    })
                });

                const tokenData = await response.json();
                
                if (!response.ok) {
                    throw new Error(tokenData.error || tokenData.message || 'Token exchange failed');
                }

                // Store in session
                req.session.quekey = {
                    accessToken: tokenData.access_token?.token || tokenData.access_token,
                    user: tokenData.access_token?.authorized_user || null,
                    tokenType: tokenData.token_type
                };

                // If dev provided a custom success hook (like for DB sync / JWTs), yield to it
                if (this.onSuccess && typeof this.onSuccess === 'function') {
                    return await this.onSuccess(req, res, () => {
                        if (!res.headersSent) res.redirect(this.successRedirect);
                    });
                }

                return res.redirect(this.successRedirect);
            } catch (err) {
                console.error('[QueKey SDK] Token exchange failed:', err.message);
                return res.redirect(this.failureRedirect);
            }
        };
    }

    // ── Middleware: Protect routes ────────────────────────────────
    /**
     * Express middleware: blocks unauthenticated requests.
     */
    protect() {
        return (req, res, next) => {
            if (req.session?.quekey?.user) {
                req.user = req.session.quekey.user;
                return next();
            }
            return res.status(401).json({ error: 'Unauthorized' });
        };
    }

    // ── Helper: Get current user from session ────────────────────
    static getUser(req) {
        return req.session?.quekey?.user || null;
    }
}

module.exports = QueKeyClient;
