const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
    createContact,
    getAllContacts,
    respondToContact,
    deleteContact,
    getMyContacts
} = require('../controllers/contacts.controller');

// User route (yêu cầu đăng nhập)
router.post('/', verifyToken, createContact);

// Admin routes
router.get('/', [verifyToken, isAdmin], getAllContacts);
router.put('/:id/respond', [verifyToken, isAdmin], respondToContact);
router.delete('/:id', [verifyToken, isAdmin], deleteContact);

// Thêm route mới để user xem ý kiến của mình
router.get('/my-contacts', verifyToken, getMyContacts);

module.exports = router; 