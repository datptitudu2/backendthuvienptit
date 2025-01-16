const db = require('../config/db.config');

// Thêm sách vào yêu thích
const addFavorite = async (req, res) => {
    try {
        const { book_id } = req.body;
        const user_id = req.user.id;

        // Kiểm tra sách có tồn tại không
        const [book] = await db.query('SELECT id FROM books WHERE id = ?', [book_id]);
        if (book.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sách không tồn tại'
            });
        }

        // Kiểm tra xem đã yêu thích chưa
        const [existing] = await db.query(
            'SELECT id FROM favorites WHERE user_id = ? AND book_id = ?',
            [user_id, book_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Sách đã có trong danh sách yêu thích'
            });
        }

        // Thêm vào yêu thích
        await db.query(
            'INSERT INTO favorites (user_id, book_id) VALUES (?, ?)',
            [user_id, book_id]
        );

        res.json({
            success: true,
            message: 'Đã thêm sách vào danh sách yêu thích'
        });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Xóa sách khỏi yêu thích
const removeFavorite = async (req, res) => {
    try {
        const { book_id } = req.params;
        const user_id = req.user.id;

        const [result] = await db.query(
            'DELETE FROM favorites WHERE user_id = ? AND book_id = ?',
            [user_id, book_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sách không có trong danh sách yêu thích'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa sách khỏi danh sách yêu thích'
        });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Lấy danh sách sách yêu thích
const getFavorites = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [favorites] = await db.query(
            `SELECT 
                b.id,
                b.title,
                b.author,
                b.isbn,
                b.category,
                b.publisher,
                b.publish_year,
                b.description,
                b.image_url,
                b.quantity,
                b.available_quantity,
                f.created_at as favorited_at
            FROM favorites f
            JOIN books b ON f.book_id = b.id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC`,
            [user_id]
        );

        res.json({
            success: true,
            data: favorites
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Kiểm tra sách có trong yêu thích không
const checkFavorite = async (req, res) => {
    try {
        const { book_id } = req.params;
        const user_id = req.user.id;

        const [favorite] = await db.query(
            'SELECT id FROM favorites WHERE user_id = ? AND book_id = ?',
            [user_id, book_id]
        );

        res.json({
            success: true,
            isFavorited: favorite.length > 0
        });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

module.exports = {
    addFavorite,
    removeFavorite,
    getFavorites,
    checkFavorite
}; 