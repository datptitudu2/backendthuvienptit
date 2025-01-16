const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getBookReviews,
    addReview,
    updateReview,
    deleteReview,
    getUserReviews
} = require('../controllers/reviews.controller');

// Public routes
router.get('/book/:book_id', getBookReviews);

// User routes (require authentication)
router.post('/book/:book_id', verifyToken, addReview);
router.put('/:id', verifyToken, updateReview);
router.delete('/:id', verifyToken, deleteReview);
router.get('/my-reviews', verifyToken, getUserReviews);

module.exports = router; 