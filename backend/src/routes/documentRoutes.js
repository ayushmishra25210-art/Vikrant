const express = require('express');
const {
  uploadDocument,
  assignRecipients,
  listDocuments,
  getDocument,
  decryptDocument,
  getDocumentProvenance,
} = require('../controllers/documentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);

router.post('/upload', requireRole('admin'), upload.single('file'), uploadDocument);
router.post('/:id/assign', requireRole('admin'), assignRecipients);
router.post('/:id/decrypt', requireRole('recipient'), decryptDocument);
router.get('/:id/provenance', getDocumentProvenance);
router.get('/:id', getDocument);
router.get('/', listDocuments);

module.exports = router;
