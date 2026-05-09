const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  // Log error
  console.error(`[${new Date().toISOString()}] ${status} - ${message}`);

  // Handle validation errors
  if (err.details) {
    return res.status(status).json({
      success: false,
      error: {
        code: status,
        message,
        details: err.details,
      },
    });
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 400,
        message: 'File upload error: ' + err.message,
        details: [],
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({
      success: false,
      error: {
        code: 403,
        message: 'Invalid token',
        details: [],
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(403).json({
      success: false,
      error: {
        code: 403,
        message: 'Token expired',
        details: [],
      },
    });
  }

  // Default error response
  res.status(status).json({
    success: false,
    error: {
      code: status,
      message,
      details: [],
    },
  });
};

module.exports = errorHandler;
