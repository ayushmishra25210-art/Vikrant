const express = require('express');
const { listRecipients, getRecipientHistory } = require('../controllers/recipientController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listRecipients);
router.get('/:id/history', getRecipientHistory);

module.exports = router;
