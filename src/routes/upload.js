const router = require('express').Router();
const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true) : cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, { folder: 'grupo-shop/products' });
    res.json({ url: result.secure_url });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to upload image' }); }
});

module.exports = router;