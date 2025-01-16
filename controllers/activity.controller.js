const db = require('../config/db.config');

// Lấy lịch sử hoạt động của user
const getUserActivities = async (req, res) => {
    try {
        const user_id = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [activities] = await db.query(
            `SELECT * FROM user_activities 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [user_id, limit, offset]
        );

        const [totalCount] = await db.query(
            'SELECT COUNT(*) as count FROM user_activities WHERE user_id = ?',
            [user_id]
        );

        res.json({
            success: true,
            data: {
                activities,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalCount[0].count / limit),
                    total_items: totalCount[0].count,
                    items_per_page: limit
                }
            }
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Hàm tiện ích để log hoạt động
const logActivity = async (user_id, action, description, req) => {
    try {
        await db.query(
            `INSERT INTO user_activities 
             (user_id, action, description, ip_address) 
             VALUES (?, ?, ?, ?)`,
            [user_id, action, description, req.ip]
        );
    } catch (error) {
        console.error('Log activity error:', error);
    }
};

module.exports = {
    getUserActivities,
    logActivity
}; 