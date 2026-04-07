const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());

// ── Hardcoded users (server-side only — never sent to client) ──────────
const USERS = {
  user:   'crewforge',
  tester: 'crewtester',
  admin:  'crewadmin42',
};

// In-memory token store  (maps token → { username, expiresAt })
const tokens = new Map();
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// ── POST /api/auth — login ─────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      ok: false,
      error: { code: 'auth.missing_fields', message: 'Username and password are required.' },
    });
  }

  const expected = USERS[username];
  if (!expected || expected !== password) {
    return res.status(401).json({
      ok: false,
      error: { code: 'auth.invalid_credentials', message: 'Invalid username or password.' },
    });
  }

  const token = crypto.randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_SECONDS * 1000;
  tokens.set(token, { username, expiresAt });

  return res.json({
    ok: true,
    authenticated: true,
    token,
    expires_at: expiresAt,
    token_ttl_seconds: TOKEN_TTL_SECONDS,
  });
});

// ── DELETE /api/auth/token — logout / revoke ───────────────────────────
app.delete('/api/auth/token', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token) tokens.delete(token);
  res.json({ ok: true, revoked: true });
});

// ── Serve the Vite build output ────────────────────────────────────────
const buildDir = path.join(__dirname, '..', 'build');
app.use(express.static(buildDir));

// SPA fallback — serve index.html for any non-API, non-static route
app.get('*', (_req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, () => {
  console.log(`CrewForge server listening on port ${PORT}`);
});
