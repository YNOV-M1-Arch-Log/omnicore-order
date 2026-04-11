const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Dual-validation middleware for routes called both from the gateway
 * (user request) and directly from sibling services (service-to-service).
 *
 * Accepts the request if EITHER condition is met:
 *   1. X-Internal-Service-Token header matches the shared secret
 *      → service-to-service call (payment → order)
 *   2. Authorization: Bearer <JWT> is valid
 *      → user request proxied through the gateway; req.user is populated
 *        so downstream handlers can log/audit who triggered the action
 *
 * Rejects with 401 if neither condition is satisfied.
 */
const internalAuth = (req, res, next) => {
  // ── Option 1: Internal service token ──────────────────────────────────────
  const token = req.headers['x-internal-service-token'];

  if (config.internalServiceToken && token) {
    if (token === config.internalServiceToken) {
      return next();
    }
    // Token present but wrong — reject immediately (don't fall through to JWT)
    return res.status(401).json({ error: { message: 'Invalid internal service token', status: 401 } });
  }

  // ── Option 2: Valid user JWT forwarded by the gateway ─────────────────────
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    if (!config.jwtSecret) {
      return res.status(500).json({ error: { message: 'JWT_SECRET not configured', status: 500 } });
    }

    try {
      const payload = jwt.verify(authHeader.slice(7), config.jwtSecret);
      // Populate req.user for audit logging in controllers
      req.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
      };
      return next();
    } catch {
      return res.status(401).json({ error: { message: 'Invalid or expired token', status: 401 } });
    }
  }

  // ── Neither condition met ──────────────────────────────────────────────────
  return res.status(401).json({ error: { message: 'Unauthorized — missing credentials', status: 401 } });
};

module.exports = internalAuth;
