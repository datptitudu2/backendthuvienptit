const db = require('../config/db.config');

const getUserPenalties = async (req, res) => {
    try {
        const userId = req.user.id;
        const [penalties] = await db.query(
            `SELECT p.*, b.title as book_title, b.author 
             FROM penalties p
             JOIN borrows br ON p.borrow_id = br.id
             JOIN books b ON br.book_id = b.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: penalties
        });
    } catch (error) {
        console.error('Get penalties error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách phạt'
        });
    }
};

const createPenalty = async (req, res) => {
    try {
        const { borrow_id, reason, amount } = req.body;
        
        // Kiểm tra mượn sách tồn tại
        const [borrow] = await db.query(
            'SELECT user_id, book_id FROM borrows WHERE id = ?',
            [borrow_id]
        );

        if (borrow.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiếu mượn'
            });
        }

        // Tạo phiếu phạt
        await db.query(
            'INSERT INTO penalties (borrow_id, user_id, reason, amount, status) VALUES (?, ?, ?, ?, "unpaid")',
            [borrow_id, borrow[0].user_id, reason, amount]
        );

        res.json({
            success: true,
            message: 'Tạo phiếu phạt thành công'
        });
    } catch (error) {
        console.error('Create penalty error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo phiếu phạt'
        });
    }
};

const getAllPenalties = async (req, res) => {
    try {
        const [penalties] = await db.query(
            `SELECT p.*, u.full_name, b.title as book_title
             FROM penalties p
             JOIN users u ON p.user_id = u.id
             JOIN borrows br ON p.borrow_id = br.id
             JOIN books b ON br.book_id = b.id
             ORDER BY p.created_at DESC`
        );

        res.json({
            success: true,
            data: penalties
        });
    } catch (error) {
        console.error('Get all penalties error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách phạt'
        });
    }
};

const updatePenaltyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.query(
            'UPDATE penalties SET status = ?, paid_at = ? WHERE id = ?',
            [status, status === 'paid' ? new Date() : null, id]
        );

        res.json({
            success: true,
            message: 'Cập nhật trạng thái phạt thành công'
        });
    } catch (error) {
        console.error('Update penalty status error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái phạt'
        });
    }
};

module.exports = {
    getUserPenalties,
    createPenalty,
    getAllPenalties,
    updatePenaltyStatus
}; 