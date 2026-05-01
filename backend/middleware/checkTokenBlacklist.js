/**
 * Purpose:
 * Middleware that blocks requests made with blacklisted JWT jti values.
 * It runs before standard authentication middleware.
 */
const jwt = require('jsonwebtoken');
const TokenBlacklistService = require('../Services/TokenBlacklistService');

const tokenBlacklistService = new TokenBlacklistService();

module.exports = async function checkTokenBlacklist(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.slice(7).trim();
    if (!token) return next();

    const decoded = jwt.decode(token);
    const jti = decoded?.jti;
    if (!jti) return next();

    const blocked = await tokenBlacklistService.isBlacklisted(jti);
    if (blocked) {
      return res.status(401).json({ error: 'Token i invaliduar' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
