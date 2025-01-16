const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
    getAllRules,
    getRuleById,
    addRule,
    updateRule,
    deleteRule
} = require('../controllers/rules.controller');

// Public routes
router.get('/', getAllRules);
router.get('/:id', getRuleById);

// Admin only routes
router.post('/', [verifyToken, isAdmin], addRule);
router.put('/:id', [verifyToken, isAdmin], updateRule);
router.delete('/:id', [verifyToken, isAdmin], deleteRule);

module.exports = router;