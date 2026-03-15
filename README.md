# QueKey Node.js SDK

Server-side SDK for integrating **QueKey Passwordless Face-Recognition Authentication** into Node.js apps.

Works like Google OAuth — configure once, add two routes, done.

## Installation

```bash
npm install quekey-connect-node
```

## Quick Start (Express)

```javascript
const express = require('express');
const session = require('express-session');
const QueKey = require('quekey-connect-node');

const app = express();
app.use(session({ secret: 'your-secret', resave: false, saveUninitialized: true }));

const quekey = new QueKey({
    clientId: process.env.QUEKEY_CLIENT_ID,
    clientSecret: process.env.QUEKEY_CLIENT_SECRET,
    redirectUri: 'http://localhost:4000/auth/quekey/callback',
    environment: 'sandbox', // or 'live'
    successRedirect: '/dashboard',
    failureRedirect: '/login'
});

// 1. Start login → redirects user to QueKey for face scan
app.get('/auth/quekey', quekey.login());

// 2. Handle callback → exchanges code, sets session, redirects to dashboard
app.get('/auth/quekey/callback', quekey.callback());

// 3. Protect any route
app.get('/dashboard', quekey.protect(), (req, res) => {
    res.json({ user: req.user });
});
```

### Frontend

Your frontend only needs a single link. No SDK, no tokens, no auth URLs:

```html
<a href="http://localhost:4000/auth/quekey">Sign in with QueKey</a>
```

That's it. The backend handles everything.

## Configuration

| Option | Required | Default | Description |
|---|---|---|---|
| `clientId` | ✅ | — | Your QueKey Client ID |
| `clientSecret` | ✅ | — | Your QueKey Client Secret |
| `redirectUri` | ✅ | — | Your backend callback URL |
| `environment` | ❌ | `live` | QueKey environment (`sandbox` or `live`) |
| `authServerUrl` | ❌ | — | Override for custom deployments |
| `successRedirect` | ❌ | `/` | Where to go after login |
| `failureRedirect` | ❌ | `/login` | Where to go on error |
| `onSuccess` | ❌ | — | Custom callback hook `(req, res, next)` for DB sinking or JWT generation |

## API

| Method | Description |
|---|---|
| `quekey.login()` | Returns Express handler that redirects to QueKey |
| `quekey.callback()` | Returns Express handler that completes token exchange |
| `quekey.protect()` | Returns Express middleware that blocks unauthenticated requests |
| `QueKey.getUser(req)` | Static helper to get user from session |

## Session Data

After successful auth, `req.session.quekey` contains:

```json
{
    "accessToken": "7e938bcd39f...",
    "user": { "qid": "Q8=E698...", "first_name": "John", "last_name": "Doe", "email": "john@example.com" },
    "tokenType": "Bearer"
}
```

## License
MIT © GeneralQuery Technologies
