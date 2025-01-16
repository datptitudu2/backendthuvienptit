const express = require('express');
const router = express.Router();
const db = require('../config/db.config');
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const upload = require('../middleware/upload.middleware');
const {
    getAllBooks,
    getBookById,
    addBook,
    updateBook,
    deleteBook,
    searchBooks,
    getBookPreview,
    getBooksByCategory
} = require('../controllers/books.controller');
const cacheMiddleware = require('../middleware/cache.middleware');
const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, '../public/uploads/books');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Public routes
router.get('/', cacheMiddleware(300), getAllBooks);
router.get('/search', searchBooks);
router.get('/:id', getBookById);
router.get('/:id/preview', getBookPreview);
router.get('/category/:categoryId', getBooksByCategory);

// Admin only routes
router.post('/', [
    verifyToken, 
    isAdmin,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'preview_pdf', maxCount: 1 }
    ])
], addBook);
router.put('/:id', [
    verifyToken, 
    isAdmin,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'preview_pdf', maxCount: 1 }
    ])
], updateBook);
router.delete('/:id', [verifyToken, isAdmin], deleteBook);

module.exports = router; 