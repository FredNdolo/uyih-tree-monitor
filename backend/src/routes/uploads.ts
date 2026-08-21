import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/v1/uploads — single image
router.post(
  '/',
  requireAuth,
  requireRole('field_team', 'admin', 'super_admin'),
  upload.single('photo'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    // Public URL (served by Express static)
    const url = `/uploads/${req.file.filename}`;

    res.status(201).json({
      url,
      filename: req.file.filename,
      size: req.file.size,
    });
  }
);

export default router;