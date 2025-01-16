const db = require('../config/db.config');
const { 
    notifyBorrow, 
    notifyReturn, 
    checkLowStock 
} = require('./notifications.controller');
const { logActivity } = require('./activity.controller');

// Tạo phiếu mượn sách
const createBorrow = async (req, res) => {
    try {
        const { book_id } = req.body;
        const user_id = req.user.id;
        
        // Tự động tạo borrow_date và due_date
        const borrow_date = new Date().toISOString().split('T')[0];
        const due_date = new Date();
        due_date.setDate(due_date.getDate() + 14); // Mượn 14 ngày
        const formatted_due_date = due_date.toISOString().split('T')[0];

        // Validate input
        if (!book_id) {
            return res.status(400).json({
                success: false,
                message: 'Please provide book_id'
            });
        }

        // Kiểm tra sách có tồn tại và còn sách để mượn không
        const [books] = await db.query(
            'SELECT * FROM books WHERE id = ? AND available_quantity > 0',
            [book_id]
        );

        if (books.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Book not available for borrowing'
            });
        }

        // Kiểm tra người dùng có đang mượn quá 3 cuốn không
        const [activeLoans] = await db.query(
            'SELECT COUNT(*) as count FROM borrows WHERE user_id = ? AND status = "borrowed"',
            [user_id]
        );

        if (activeLoans[0].count >= 3) {
            return res.status(400).json({
                success: false,
                message: 'You have reached the maximum number of books you can borrow (3)'
            });
        }

        // Bắt đầu transaction
        await db.query('START TRANSACTION');

        try {
            // Tạo phiếu mượn
            const [result] = await db.query(
                `INSERT INTO borrows (user_id, book_id, borrow_date, due_date, status) 
                VALUES (?, ?, ?, ?, 'borrowed')`,
                [user_id, book_id, borrow_date, formatted_due_date]
            );

            // Cập nhật số lượng sách có sẵn
            await db.query(
                'UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?',
                [book_id]
            );

            await db.query('COMMIT');

            // Thêm thông báo mượn sách
            await notifyBorrow(
                req.user.id, 
                books[0].title,
                formatted_due_date
            );

            // Kiểm tra và thông báo nếu sách sắp hết
            if (books[0].available_quantity < 5) {
                await checkLowStock();
            }

            // Log hoạt động mượn sách
            await logActivity(
                user_id,
                'borrow_book',
                `Mượn sách "${books[0].title}"`,
                req
            );

            res.status(201).json({
                success: true,
                message: 'Book borrowed successfully',
                data: {
                    borrow_id: result.insertId,
                    book_id,
                    borrow_date,
                    due_date: formatted_due_date
                }
            });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Create borrow error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Trả sách
const returnBook = async (req, res) => {
    try {
        const borrow_id = req.params.borrow_id;
        const user_id = req.user.id;

        // Kiểm tra phiếu mượn tồn tại
        const [checkBorrow] = await db.query(
            `SELECT b.*, books.title 
             FROM borrows b
             JOIN books ON b.book_id = books.id
             WHERE b.id = ? AND b.user_id = ? AND b.status = 'borrowed'`,
            [borrow_id, user_id]
        );

        if (checkBorrow.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiếu mượn hoặc sách đã được trả'
            });
        }

        const borrow = checkBorrow[0];
        const return_date = new Date().toISOString().split('T')[0];

        // Thực hiện trả sách
        await db.query('START TRANSACTION');

        try {
            // Cập nhật trạng thái mượn
            await db.query(
                'UPDATE borrows SET status = ?, return_date = ? WHERE id = ?',
                ['returned', return_date, borrow_id]
            );

            // Cập nhật số lượng sách
            await db.query(
                'UPDATE books SET available_quantity = available_quantity + 1 WHERE id = ?',
                [borrow.book_id]
            );

            // Commit transaction trước khi gửi thông báo
            await db.query('COMMIT');

            // Thử gửi thông báo, nhưng không để lỗi thông báo ảnh hưởng đến việc trả sách
            try {
                await notifyReturn(user_id, borrow.title);
            } catch (notifyError) {
                console.error('Notification error:', notifyError);
                // Không throw error ở đây
            }

            // Log hoạt động trả sách
            await logActivity(
                user_id,
                'return_book',
                `Trả sách "${borrow.title}"`,
                req
            );

            return res.json({
                success: true,
                message: 'Trả sách thành công',
                data: {
                    borrow_id,
                    book_title: borrow.title,
                    return_date
                }
            });

        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Return book error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi trả sách'
        });
    }
};

// Lấy danh sách mượn sách của user
const getUserBorrows = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [borrows] = await db.query(
            `SELECT b.*, books.title, books.author 
            FROM borrows b 
            JOIN books ON b.book_id = books.id 
            WHERE b.user_id = ? 
            ORDER BY b.created_at DESC`,
            [user_id]
        );

        res.json({
            success: true,
            data: borrows
        });
    } catch (error) {
        console.error('Get user borrows error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Admin: Lấy tất cả phiếu mượn
const getAllBorrows = async (req, res) => {
    try {
        const [borrows] = await db.query(
            `SELECT b.*, 
                books.title as book_title, 
                users.full_name as user_name,
                users.email as user_email
            FROM borrows b 
            JOIN books ON b.book_id = books.id 
            JOIN users ON b.user_id = users.id 
            ORDER BY b.created_at DESC`
        );

        res.json({
            success: true,
            data: borrows
        });
    } catch (error) {
        console.error('Get all borrows error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    createBorrow,
    returnBook,
    getUserBorrows,
    getAllBorrows
}; 