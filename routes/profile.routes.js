const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const uploadAvatar = require('../middleware/uploadAvatar.middleware');
const {
    getProfile,
    updateProfile,
    updateAvatar,
    changePassword
} = require('../controllers/profile.controller');

router.get('/', verifyToken, getProfile);
router.put('/', verifyToken, updateProfile);
router.put('/password', verifyToken, changePassword);

router.post('/avatar', verifyToken, uploadAvatar.single('avatar'), updateAvatar);

module.exports = router; 