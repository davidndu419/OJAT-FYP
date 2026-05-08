const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  console.log('[AuthMiddleware] Incoming Authorization header:', authHeader);

  if (!process.env.JWT_SECRET) {
    console.error('[AuthMiddleware] JWT_SECRET is not defined');
    return res.status(500).json({ message: 'Server auth configuration error' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    console.warn('[AuthMiddleware] Authorization token missing or malformed');
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    console.log('[AuthMiddleware] Token verification succeeded for userId:', req.userId);
    return next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification failed:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
