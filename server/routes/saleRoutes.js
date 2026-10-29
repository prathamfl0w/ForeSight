const express = require('express');
const router = express.Router();
const { createSale, getSales, deleteSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createSale);
router.get('/', protect, getSales);
router.delete('/:id', protect, deleteSale);

module.exports = router;

