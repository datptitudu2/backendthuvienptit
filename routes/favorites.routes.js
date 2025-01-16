const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    addFavorite,
    removeFavorite,
    getFavorites,
    checkFavorite
} = require('../controllers/favorites.controller');

router.post('/', verifyToken, addFavorite);
router.delete('/:book_id', verifyToken, removeFavorite);
router.get('/', verifyToken, getFavorites);
router.get('/check/:book_id', verifyToken, checkFavorite);

module.exports = router; 