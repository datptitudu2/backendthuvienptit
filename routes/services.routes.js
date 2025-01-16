const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getAllServices,
    getServiceById,
    registerService,
    getCurrentService,
    createService,
    updateService,
    deleteService,
    isAdmin,
    getUserServices,
    cancelUserService
} = require('../controllers/services.controller');

// Public routes
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// User routes (cần token)
router.post('/register', verifyToken, registerService);
router.get('/user/current', verifyToken, getCurrentService);

// Admin routes (cần token và phải là admin)
router.post('/', verifyToken, isAdmin, createService);
router.put('/:id', verifyToken, isAdmin, updateService);
router.delete('/:id', verifyToken, isAdmin, deleteService);



module.exports = router; 