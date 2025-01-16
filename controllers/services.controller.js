const db = require('../config/db.config');

// Lấy danh sách tất cả dịch vụ
const getAllServices = async (req, res) => {
    try {
        const [services] = await db.query(
            'SELECT * FROM services WHERE is_active = true'
        );

        res.json({
            success: true,
            data: services
        });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Lấy chi tiết một dịch vụ
const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const [service] = await db.query(
            'SELECT * FROM services WHERE id = ? AND is_active = true',
            [id]
        );

        if (service.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            data: service[0]
        });
    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Đăng ký dịch vụ
const registerService = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { service_id } = req.body;

        // Kiểm tra dịch vụ tồn tại
        const [service] = await db.query(
            'SELECT * FROM services WHERE id = ? AND is_active = true',
            [service_id]
        );

        if (service.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Kiểm tra user đã có dịch vụ đang active chưa
        const [activeService] = await db.query(
            'SELECT * FROM user_services WHERE user_id = ? AND status = "active"',
            [user_id]
        );

        if (activeService.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active service'
            });
        }

        // Tính ngày bắt đầu và kết thúc
        const start_date = new Date();
        const end_date = new Date();
        end_date.setDate(end_date.getDate() + service[0].duration);

        // Đăng ký dịch vụ mới
        await db.query(
            'INSERT INTO user_services (user_id, service_id, start_date, end_date) VALUES (?, ?, ?, ?)',
            [user_id, service_id, start_date, end_date]
        );

        res.json({
            success: true,
            message: 'Service registered successfully'
        });
    } catch (error) {
        console.error('Register service error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Lấy dịch vụ hiện tại của user
const getCurrentService = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [userService] = await db.query(
            `SELECT us.*, s.name, s.description, s.max_books 
             FROM user_services us 
             JOIN services s ON us.service_id = s.id 
             WHERE us.user_id = ? AND us.status = 'active'`,
            [user_id]
        );

        if (userService.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active service found'
            });
        }

        res.json({
            success: true,
            data: userService[0]
        });
    } catch (error) {
        console.error('Get current service error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Middleware kiểm tra admin
const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
    next();
};

// Thêm dịch vụ mới (Admin only)
const createService = async (req, res) => {
    try {
        const { name, description, price, duration, max_books } = req.body;

        // Validate input
        if (!name || !price || !duration || !max_books) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Kiểm tra tên dịch vụ đã tồn tại chưa
        const [existingService] = await db.query(
            'SELECT id FROM services WHERE name = ?',
            [name]
        );

        if (existingService.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Service name already exists'
            });
        }

        // Thêm dịch vụ mới
        await db.query(
            'INSERT INTO services (name, description, price, duration, max_books) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, duration, max_books]
        );

        res.status(201).json({
            success: true,
            message: 'Service created successfully'
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Cập nhật dịch vụ (Admin only)
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, duration, max_books, is_active } = req.body;

        // Kiểm tra dịch vụ tồn tại
        const [service] = await db.query(
            'SELECT * FROM services WHERE id = ?',
            [id]
        );

        if (service.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Kiểm tra tên dịch vụ trùng lặp (nếu có thay đổi tên)
        if (name && name !== service[0].name) {
            const [existingService] = await db.query(
                'SELECT id FROM services WHERE name = ? AND id != ?',
                [name, id]
            );

            if (existingService.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Service name already exists'
                });
            }
        }

        // Cập nhật dịch vụ
        await db.query(
            `UPDATE services 
             SET name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 price = COALESCE(?, price),
                 duration = COALESCE(?, duration),
                 max_books = COALESCE(?, max_books),
                 is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, description, price, duration, max_books, is_active, id]
        );

        res.json({
            success: true,
            message: 'Service updated successfully'
        });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Xóa dịch vụ (Admin only - soft delete)
const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra dịch vụ tồn tại
        const [service] = await db.query(
            'SELECT * FROM services WHERE id = ? AND is_active = true',
            [id]
        );

        if (service.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Kiểm tra có user đang sử dụng dịch vụ không
        const [activeUsers] = await db.query(
            'SELECT COUNT(*) as count FROM user_services WHERE service_id = ? AND status = "active"',
            [id]
        );

        if (activeUsers[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete service with active users'
            });
        }

        // Soft delete dịch vụ
        await db.query(
            'UPDATE services SET is_active = false WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


module.exports = {
    getAllServices,
    getServiceById,
    registerService,
    getCurrentService,
    createService,
    updateService,
    deleteService,
    isAdmin,
   
}; 