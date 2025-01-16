const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
    createPenalty,
    getUserPenalties,
    getAllPenalties,
    updatePenaltyStatus
} = require('../controllers/penalties.controller');

// User routes
router.get('/', verifyToken, getUserPenalties);

// Admin routes
router.post('/', [verifyToken, isAdmin], createPenalty);
router.get('/all', [verifyToken, isAdmin], getAllPenalties);
router.put('/:id/status', [verifyToken, isAdmin], updatePenaltyStatus);

module.exports = router; 