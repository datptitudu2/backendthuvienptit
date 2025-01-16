const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
    createBorrow,
    returnBook,
    getUserBorrows,
    getAllBorrows
} = require('../controllers/borrows.controller');

// User routes
router.post('/', verifyToken, createBorrow);
router.post('/return/:borrow_id', verifyToken, returnBook);
router.get('/my-borrows', verifyToken, getUserBorrows);

// Admin routes
router.get('/all', [verifyToken, isAdmin], getAllBorrows);

module.exports = router; 