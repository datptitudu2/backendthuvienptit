const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categories.controller');

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin routes
router.post('/', [verifyToken, isAdmin], createCategory);
router.put('/:id', [verifyToken, isAdmin], updateCategory);
router.delete('/:id', [verifyToken, isAdmin], deleteCategory);

module.exports = router; 