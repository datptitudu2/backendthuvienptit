const db = require('../config/db.config');

// Lấy tất cả reviews của một sách
const getBookReviews = async (req, res) => {
    try {
        const { book_id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Kiểm tra sách tồn tại
        const [book] = await db.query(
            'SELECT id FROM books WHERE id = ?',
            [book_id]
        );

        if (book.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        // Lấy tổng số reviews
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM reviews WHERE book_id = ? AND is_active = true',
            [book_id]
        );
        const total = countResult[0].total;

        // Lấy danh sách reviews
        const [reviews] = await db.query(
            `SELECT r.*, 
                u.full_name as user_name, 
                COALESCE(u.avatar_url, '/uploads/avatars/default-avatar.jpg') as user_avatar 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.book_id = ? AND r.is_active = true 
            ORDER BY r.created_at DESC 
            LIMIT ? OFFSET ?`,
            [book_id, parseInt(limit), offset]
        );

        // Tính rating trung bình
        const [avgRating] = await db.query(
            'SELECT AVG(rating) as average_rating FROM reviews WHERE book_id = ? AND is_active = true',
            [book_id]
        );

        res.json({
            success: true,
            data: {
                reviews: reviews.map(review => ({
                    ...review,
                    user_avatar: review.user_avatar || '/uploads/avatars/default-avatar.jpg'
                })),
                average_rating: avgRating[0].average_rating || 0,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get book reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Thêm review mới
const addReview = async (req, res) => {
    try {
        const { book_id } = req.params;
        const { rating, comment } = req.body;
        const user_id = req.user.id;

        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Kiểm tra sách tồn tại
        const [book] = await db.query(
            'SELECT id FROM books WHERE id = ?',
            [book_id]
        );

        if (book.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        // Kiểm tra user đã review chưa
        const [existingReview] = await db.query(
            'SELECT id FROM reviews WHERE book_id = ? AND user_id = ? AND is_active = true',
            [book_id, user_id]
        );

        if (existingReview.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this book'
            });
        }

        // Thêm review mới
        const [result] = await db.query(
            'INSERT INTO reviews (book_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
            [book_id, user_id, rating, comment]
        );

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: {
                id: result.insertId,
                book_id,
                rating,
                comment
            }
        });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Cập nhật review
const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        const { rating, comment } = req.body;

        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Kiểm tra review có tồn tại không và thuộc về user không
        const [existingReview] = await db.query(
            'SELECT * FROM reviews WHERE id = ? AND user_id = ? AND is_active = true',
            [id, user_id]
        );

        if (existingReview.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Cập nhật review
        await db.query(
            'UPDATE reviews SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [rating, comment, id]
        );

        return res.json({
            success: true,
            message: 'Review updated successfully'
        });

    } catch (error) {
        console.error('Update review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Xóa review (soft delete)
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // Kiểm tra review tồn tại và thuộc về user
        const [review] = await db.query(
            'SELECT * FROM reviews WHERE id = ? AND user_id = ? AND is_active = true',
            [id, user_id]
        );

        if (review.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Review not found or not authorized'
            });
        }

        // Soft delete
        await db.query(
            'UPDATE reviews SET is_active = false WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Lấy reviews của user
const getUserReviews = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Lấy tổng số reviews
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM reviews WHERE user_id = ? AND is_active = true',
            [user_id]
        );
        const total = countResult[0].total;

        // Lấy danh sách reviews
        const [reviews] = await db.query(
            `SELECT r.*, b.title as book_title, u.avatar_url as user_avatar 
            FROM reviews r 
            JOIN books b ON r.book_id = b.id 
            JOIN users u ON r.user_id = u.id 
            WHERE r.user_id = ? AND r.is_active = true 
            ORDER BY r.created_at DESC 
            LIMIT ? OFFSET ?`,
            [user_id, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const createReview = async (req, res) => {
    try {
        const { book_id, rating, comment } = req.body;
        const user_id = req.user.id;

        // Kiểm tra user đã mượn sách này chưa
        const [borrowed] = await db.query(
            'SELECT id FROM borrows WHERE user_id = ? AND book_id = ? AND status = "returned"',
            [user_id, book_id]
        );

        if (borrowed.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn cần mượn và trả sách trước khi đánh giá'
            });
        }

        await db.query(
            'INSERT INTO reviews (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)',
            [user_id, book_id, rating, comment]
        );

        res.json({
            success: true,
            message: 'Đã thêm đánh giá'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

module.exports = {
    getBookReviews,
    addReview,
    updateReview,
    deleteReview,
    getUserReviews,
    createReview
}; 