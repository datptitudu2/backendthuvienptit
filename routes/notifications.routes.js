const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const {
    getAllNotifications,
    createBulkNotifications,
    deleteNotification,
    deleteBulkNotifications,
    getUserNotifications,
    markAsRead
} = require('../controllers/notifications.controller');

// Routes cho user
router.get('/user', verifyToken, getUserNotifications);
router.put('/:notificationId/read', verifyToken, markAsRead);

// Routes cho admin (thêm middleware isAdmin)
router.get('/admin', verifyToken, isAdmin, getAllNotifications);
router.post('/admin', verifyToken, isAdmin, createBulkNotifications);
router.delete('/admin/:id', verifyToken, isAdmin, deleteNotification);
router.post('/admin/delete-bulk', verifyToken, isAdmin, deleteBulkNotifications);

module.exports = router; 