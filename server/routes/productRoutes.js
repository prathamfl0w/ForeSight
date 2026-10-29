const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * Middleware order note:
 * On POST and PATCH routes, 'protect' MUST execute before 'upload.single("image")'.
 * If 'upload' were placed before 'protect', unauthenticated clients could flood the server
 * with large file uploads, writing files to disk before their identity is validated,
 * creating an easy vector for denial-of-service and disk-exhaustion attacks.
 */
router.get('/', protect, getProducts);
router.post('/', protect, upload.single('image'), createProduct);
router.get('/:id', protect, getProduct);
router.patch('/:id', protect, upload.single('image'), updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;

