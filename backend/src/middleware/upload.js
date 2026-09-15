const multer = require('multer');
const path = require('path');
const fs = require('fs');

const tempDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

function pdfFileFilter(req, file, cb) {
  if (file.mimetype !== 'application/pdf' && path.extname(file.originalname).toLowerCase() !== '.pdf') {
    return cb(new Error('Only PDF files are accepted.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

module.exports = upload;
