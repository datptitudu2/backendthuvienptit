const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const {
    getAllNews,
    getNewsById,
    addNews,
    updateNews,
    deleteNews
} = require('../controllers/news.controller');
const upload = require('../middleware/upload.middleware');

// Public routes
router.get('/', getAllNews);
router.get('/:id', getNewsById);

// Admin only routes
router.post('/', [
    verifyToken, 
    isAdmin,
    upload.fields([
        { name: 'news_image', maxCount: 1 },
        { name: 'event_image', maxCount: 1 }
    ])
], addNews);
router.put('/:id', [
    verifyToken, 
    isAdmin,
    upload.fields([
        { name: 'news_image', maxCount: 1 },
        { name: 'event_image', maxCount: 1 }
    ])
], updateNews);
router.delete('/:id', [verifyToken, isAdmin], deleteNews);

// Thêm middleware để xử lý CORS nếu cần
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

module.exports = router;