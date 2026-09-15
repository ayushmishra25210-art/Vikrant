const express = require('express');
const { verifyLeak } = require('../controllers/verifyController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', requireAuth, requireRole('admin'), upload.single('file'), verifyLeak);

module.exports = router;
