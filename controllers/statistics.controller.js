const db = require('../config/db.config');

const getStatistics = async (req, res) => {
    try {
        // Lấy thống kê tổng quan
        const [overview] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM books) as total_books,
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM borrows) as total_borrows,
                (SELECT COUNT(*) FROM borrows WHERE status = 'borrowed') as current_borrows
        `);

        // Lấy thống kê theo tháng (6 tháng gần nhất)
        const [monthly_statistics] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as total_borrows,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as total_returns
            FROM borrows
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
        `);

        // Lấy thống kê theo danh mục
        const [category_statistics] = await db.query(`
            SELECT 
                c.name,
                COUNT(b.id) as book_count
            FROM categories c
            LEFT JOIN books b ON c.id = b.category_id
            GROUP BY c.id, c.name
            HAVING book_count > 0
            ORDER BY book_count DESC
        `);

        console.log('Category statistics from DB:', category_statistics);

        // Lấy top 5 sách được mượn nhiều nhất
        const [top_books] = await db.query(`
            SELECT 
                b.id,
                b.title,
                b.author,
                b.image_url,
                COUNT(br.id) as borrow_count,
                AVG(r.rating) as average_rating
            FROM books b
            LEFT JOIN borrows br ON b.id = br.book_id
            LEFT JOIN reviews r ON b.id = r.book_id
            GROUP BY b.id, b.title, b.author, b.image_url
            ORDER BY borrow_count DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                overview: overview[0],
                monthly_statistics,
                category_statistics,
                top_books
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê'
        });
    }
};

const getUserStatistics = async (req, res) => {
    try {
        const userId = req.user.id;

        // Lấy thống kê mượn sách của người dùng
        const [user_statistics] = await db.query(`
            SELECT 
                COUNT(*) as total_borrows,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_borrows,
                SUM(CASE WHEN status = 'borrowed' THEN 1 ELSE 0 END) as active_borrows
            FROM borrows
            WHERE user_id = ?
        `, [userId]);

        res.json({
            success: true,
            data: user_statistics[0]
        });
    } catch (error) {
        console.error('Get user statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê người dùng'
        });
    }
};

const getTimeRangeStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Lấy thống kê trong khoảng thời gian
        const [time_range_statistics] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                COUNT(*) as total_borrows,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as total_returns
            FROM borrows
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
            ORDER BY date DESC
        `, [startDate, endDate]);

        res.json({
            success: true,
            data: time_range_statistics
        });
    } catch (error) {
        console.error('Get time range statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê theo khoảng thời gian'
        });
    }
};

module.exports = {
    getStatistics,
    getUserStatistics,
    getTimeRangeStatistics
};