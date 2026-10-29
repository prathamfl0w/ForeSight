const path = require('path');
const multer = require('multer');

/**
 * Configure disk storage for Multer.
 * 
 * Why keeping the original filename is a bug:
 * If users upload files with identical common names like "product.jpg" or "image.png",
 * subsequent uploads would overwrite previous files on disk, corrupting older products' images.
 * Furthermore, original filenames may contain illegal filesystem characters or path traversal sequences.
 * Generating a unique timestamp + random suffix prevents collisions and maintains security.
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueSuffix);
  },
});

/**
 * Filter allowed image formats: jpeg, jpg, png, and webp.
 * Checks both file extension and MIME type.
 */
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpe?g|png|webp)$/i;
  const allowedMimeTypes = /^image\/(jpeg|jpg|png|webp)$/i;

  const extnameMatch = allowedExtensions.test(path.extname(file.originalname));
  const mimetypeMatch = allowedMimeTypes.test(file.mimetype);

  if (extnameMatch && mimetypeMatch) {
    return cb(null, true);
  }

  cb(new Error('Only .jpeg, .jpg, .png and .webp images are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB maximum file size
  },
});

/**
 * TECHNICAL REFERENCE NOTES:
 * 1. Single image route usage:
 *    upload.single('image')
 * 
 * 2. req.file useful properties after upload:
 *    - req.file.filename: generated unique name on disk (e.g. image-1714000-8392.jpg)
 *    - req.file.path: absolute path on disk
 *    - req.file.size: size of file in bytes
 *    - req.file.mimetype: file mime type (e.g. image/jpeg)
 *    - req.file.originalname: original file name
 * 
 * 3. Exact string to save in Product document's imageUrl field:
 *    `/uploads/${req.file.filename}`
 * 
 * 4. Multipart numeric string conversion:
 *    currentStock = Number(req.body.currentStock);
 *    leadTimeDays = Number(req.body.leadTimeDays);
 * 
 * 5. Catching Multer errors:
 *    Central error handling middleware checks:
 *    if (err instanceof multer.MulterError) {
 *      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: "Image must be smaller than 2MB" });
 *      return res.status(400).json({ message: err.message });
 *    }
 */

module.exports = upload;

