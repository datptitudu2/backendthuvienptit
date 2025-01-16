const db = require('../config/db.config');

// Tạo thông báo
const createNotification = async (userId, type, title, message) => {
    try {
        await db.query(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [userId, type, title, message]
        );
    } catch (error) {
        console.error('Create notification error:', error);
        throw error;
    }
};

// Lấy thông báo của user
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const [notifications] = await db.query(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );

        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Đánh dấu đã đọc
const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );

        res.json({
            success: true,
            message: 'Đã đánh dấu là đã đọc'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Kiểm tra sách sắp đến hạn trả
const checkDueBooks = async () => {
    try {
        const [dueBorrows] = await db.query(`
            SELECT 
                b.id as borrow_id,
                b.user_id,
                b.due_date,
                bk.title
            FROM borrows b
            JOIN books bk ON b.book_id = bk.id
            WHERE b.status = 'borrowed'
            AND b.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
        `);

        for (const borrow of dueBorrows) {
            const daysLeft = Math.ceil((new Date(borrow.due_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            await createNotification(
                borrow.user_id,
                'due_date',
                'Sắp đến hạn trả sách',
                `Sách "${borrow.title}" cần được trả trong ${daysLeft} ngày nữa`
            );
        }
    } catch (error) {
        console.error('Check due books error:', error);
    }
};

// Thông báo sách mới
const notifyNewBook = async (book) => {
    try {
        // Lấy tất cả user
        const [users] = await db.query('SELECT id FROM users');
        
        // Tạo thông báo cho từng user
        for (const user of users) {
            await createNotification(
                user.id,
                'new_book',
                'Sách mới đã được thêm vào thư viện',
                `Sách mới: "${book.title}" của tác giả ${book.author} đã có sẵn`
            );
        }
    } catch (error) {
        console.error('Notify new book error:', error);
    }
};

// Kiểm tra sách sắp hết
const checkLowStock = async () => {
    try {
        const [lowStockBooks] = await db.query(`
            SELECT id, title, available_quantity 
            FROM books 
            WHERE available_quantity < 5 
            AND available_quantity > 0
        `);

        // Thông báo cho admin
        const [admins] = await db.query(
            'SELECT id FROM users WHERE role = "admin"'
        );
        
        for (const book of lowStockBooks) {
            for (const admin of admins) {
                await createNotification(
                    admin.id,
                    'low_stock',
                    'Sách sắp hết',
                    `Sách "${book.title}" chỉ còn ${book.available_quantity} cuốn`
                );
            }
        }
    } catch (error) {
        console.error('Check low stock error:', error);
    }
};

// Thông báo khi user mượn sách
const notifyBorrow = async (userId, bookTitle, dueDate) => {
    try {
        await createNotification(
            userId,
            'borrow',
            'Mượn sách thành công',
            `Bạn đã mượn sách "${bookTitle}". Hạn trả: ${new Date(dueDate).toLocaleDateString()}`
        );
    } catch (error) {
        console.error('Notify borrow error:', error);
    }
};

// Thêm hàm thông báo trả sách
const notifyReturn = async (userId, bookTitle) => {
    try {
        await createNotification(
            userId,
            'return',
            'Trả sách thành công',
            `Bạn đã trả sách "${bookTitle}" thành công`
        );
    } catch (error) {
        console.error('Notify return error:', error);
    }
};

// Lấy tất cả thông báo (có phân trang và tìm kiếm)
const getAllNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const type = req.query.type || '';
        const offset = (page - 1) * limit;

        let query = `
            SELECT n.*, u.full_name, u.email 
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE 1=1
        `;
        let countQuery = `
            SELECT COUNT(*) as count 
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (search) {
            query += ` AND (n.title LIKE ? OR n.message LIKE ? OR u.full_name LIKE ?)`;
            countQuery += ` AND (n.title LIKE ? OR n.message LIKE ? OR u.full_name LIKE ?)`;
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam);
        }

        if (type) {
            query += ` AND n.type = ?`;
            countQuery += ` AND n.type = ?`;
            queryParams.push(type);
        }

        query += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        const [notifications] = await db.query(query, queryParams);
        const [totalCount] = await db.query(countQuery, queryParams.slice(0, -2));

        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalCount[0].count / limit),
                    total_items: totalCount[0].count,
                    items_per_page: limit
                }
            }
        });
    } catch (error) {
        console.error('Get all notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Tạo thông báo mới (cho một hoặc nhiều user)
const createBulkNotifications = async (req, res) => {
    try {
        const { user_ids, type, title, message } = req.body;

        if (!user_ids || !type || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Nếu gửi cho tất cả users
        if (user_ids === 'all') {
            const [users] = await db.query('SELECT id FROM users');
            await Promise.all(users.map(user => 
                db.query(
                    'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
                    [user.id, type, title, message]
                )
            ));
        } 
        // Nếu gửi cho một số users cụ thể
        else {
            await Promise.all(user_ids.map(user_id => 
                db.query(
                    'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
                    [user_id, type, title, message]
                )
            ));
        }

        res.json({
            success: true,
            message: 'Tạo thông báo thành công'
        });
    } catch (error) {
        console.error('Create bulk notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Xóa thông báo
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM notifications WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Xóa thông báo thành công'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Xóa nhiều thông báo
const deleteBulkNotifications = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({
                success: false,
                message: 'Danh sách ID không hợp lệ'
            });
        }

        await db.query('DELETE FROM notifications WHERE id IN (?)', [ids]);
        
        res.json({
            success: true,
            message: 'Xóa thông báo thành công'
        });
    } catch (error) {
        console.error('Delete bulk notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    checkDueBooks,
    notifyNewBook,
    checkLowStock,
    notifyBorrow,
    notifyReturn,
    getAllNotifications,
    createBulkNotifications,
    deleteNotification,
    deleteBulkNotifications
}; 