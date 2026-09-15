const express = require('express');
const { getAdminStats, getRecipientStats } = require('../controllers/statsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/admin', requireRole('admin'), getAdminStats);
router.get('/recipient', requireRole('recipient'), getRecipientStats);

module.exports = router;
