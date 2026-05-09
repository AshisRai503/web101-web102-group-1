const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const error = new Error('Access token required');
    error.status = 401;
    return next(error);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, user) => {
    if (err) {
      const error = new Error('Invalid or expired token');
      error.status = 403;
      return next(error);
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
