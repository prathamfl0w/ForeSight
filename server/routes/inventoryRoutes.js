const express = require('express');
const router = express.Router();
const { getForecast } = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');

router.get('/forecast', protect, getForecast);

module.exports = router;

