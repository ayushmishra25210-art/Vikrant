// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  if (err.name === 'MulterError' || err.message === 'Only PDF files are accepted.') {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  return res.status(err.statusCode || 500).json({ message: err.message || 'Internal server error.' });
}

module.exports = errorHandler;
