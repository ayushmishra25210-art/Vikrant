const express = require('express');
const { getLedger, verifyLedger } = require('../controllers/ledgerController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/verify', verifyLedger);
router.get('/', getLedger);

module.exports = router;
