const config = require('../config');

/**
 * Validates that the request carries a trusted X-Internal-Service-Token header.
 * Applied on routes that are called internally (service-to-service) but must
 * not be accessible by unauthenticated external callers bypassing the gateway.
 *
 * The token is injected by:
 *   - The gateway on all proxied requests
 *   - Any sibling service making a direct inter-service call (e.g. payment → order)
 */
const internalAuth = (req, res, next) => {
  const token = req.headers['x-internal-service-token'];

  if (!config.internalServiceToken) {
    return res.status(500).json({ error: { message: 'Internal service token not configured', status: 500 } });
  }

  if (!token || token !== config.internalServiceToken) {
    return res.status(401).json({ error: { message: 'Missing or invalid internal service token', status: 401 } });
  }

  next();
};

module.exports = internalAuth;
