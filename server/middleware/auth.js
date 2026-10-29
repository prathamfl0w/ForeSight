const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware:
 * 
 * 1. "Bearer" authentication denotes a token-based HTTP authentication scheme where the bearer
 *    (the holder or client presenting the token) is granted access to the protected resource.
 * 2. Security design: The token is sent in the 'Authorization' HTTP header rather than as a URL
 *    query parameter. If tokens are in URLs, they get persisted in browser history, server access logs,
 *    network proxy caches, and HTTP Referer headers sent to third-party domains, creating severe security risks.
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorised, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorised, user no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ message: 'Not authorised, token failed' });
  }
};

module.exports = { protect };

