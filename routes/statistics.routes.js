const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
    getStatistics,
    getUserStatistics,
    getTimeRangeStatistics
} = require('../controllers/statistics.controller');

// Apply verifyToken middleware to all routes
router.use(verifyToken);

// Apply isAdmin middleware only to admin-specific routes
router.get('/', isAdmin, getStatistics);
router.get('/time-range', isAdmin, getTimeRangeStatistics);

// Route for user-specific statistics
router.get('/user', getUserStatistics);

module.exports = router;