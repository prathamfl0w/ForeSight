const multer = require('multer');

/**
 * Express Central Error Handling Middleware.
 * 
 * Why the 4-argument signature (err, req, res, next) is mandatory:
 * Express inspects the function's arity (Function.length) to determine whether a middleware
 * is an error handler. Even if the 'next' parameter is never called inside this handler,
 * omitting it would reduce the arity to 3, causing Express to treat it as a standard request
 * middleware rather than catching thrown errors.
 */
const errorHandler = (err, req, res, next) => {
  // Always log the actual error on the server console for debugging
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let fields;

  // 1. Mongoose CastError (invalid/malformed MongoDB ObjectId)
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // 2. Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    fields = {};
    const messages = [];
    for (const key of Object.keys(err.errors || {})) {
      fields[key] = err.errors[key].message;
      messages.push(err.errors[key].message);
    }
    message = messages.join(', ');
  }

  // 3. MongoDB Duplicate Key Error (code 11000)
  else if (err.code === 11000) {
    statusCode = 400;
    const fieldName = err.keyValue ? Object.keys(err.keyValue)[0] : 'Field';
    message = `${fieldName} already exists`;
  }

  // 4. JWT JsonWebTokenError
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  // 5. JWT TokenExpiredError
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired';
  }

  // 6. Multer errors
  else if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Image must be smaller than 2MB';
    } else {
      message = err.message;
    }
  }

  const response = { message };
  if (fields) {
    response.fields = fields;
  }

  // Never leak sensitive internals or stack traces in production
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;

