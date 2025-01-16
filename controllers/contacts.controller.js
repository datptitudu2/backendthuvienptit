const db = require('../config/db.config');

// Gửi contact mới (Yêu cầu đăng nhập)
const createContact = async (req, res) => {
    try {
        const { subject, message } = req.body;
        const user_id = req.user.id;  // Lấy từ token

        // Validate input
        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide subject and message'
            });
        }

        // Lấy thông tin user
        const [user] = await db.query(
            'SELECT full_name, email FROM users WHERE id = ?',
            [user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Thêm contact mới với user_id
        const [result] = await db.query(
            `INSERT INTO contacts (user_id, name, email, subject, message, status) 
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [user_id, user[0].full_name, user[0].email, subject, message]
        );

        res.status(201).json({
            success: true,
            message: 'Thank you for your feedback',
            data: {
                id: result.insertId
            }
        });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Admin: Lấy danh sách contact
const getAllContacts = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT c.*, u.full_name, u.email 
            FROM contacts c
            JOIN users u ON c.user_id = u.id
            WHERE c.is_active = true
        `;
        const values = [];

        if (status) {
            query += ' AND c.status = ?';
            values.push(status);
        }

        query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        values.push(parseInt(limit), offset);

        const [contacts] = await db.query(query, values);
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM contacts c WHERE c.is_active = true' + 
            (status ? ' AND c.status = ?' : ''),
            status ? [status] : []
        );

        res.json({
            success: true,
            data: {
                contacts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    total_pages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Admin: Trả lời contact
const respondToContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        // Validate input
        if (!response) {
            return res.status(400).json({
                success: false,
                message: 'Please provide response message'
            });
        }

        // Kiểm tra contact tồn tại
        const [contact] = await db.query(
            'SELECT * FROM contacts WHERE id = ? AND is_active = true',
            [id]
        );

        if (contact.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // Cập nhật response
        await db.query(
            `UPDATE contacts 
             SET response = ?, status = 'responded' 
             WHERE id = ?`,
            [response, id]
        );

        res.json({
            success: true,
            message: 'Response sent successfully'
        });
    } catch (error) {
        console.error('Respond to contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Admin: Xóa contact (soft delete)
const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'UPDATE contacts SET is_active = false WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Thêm function mới để lấy contacts của user đang đăng nhập
const getMyContacts = async (req, res) => {
    try {
        const user_id = req.user.id;
        
        const [contacts] = await db.query(
            `SELECT c.*, u.full_name, u.email 
             FROM contacts c
             JOIN users u ON c.user_id = u.id
             WHERE c.user_id = ? AND c.is_active = true 
             ORDER BY c.created_at DESC`,
            [user_id]
        );

        res.json({
            success: true,
            data: contacts
        });
    } catch (error) {
        console.error('Get my contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    createContact,
    getAllContacts,
    respondToContact,
    deleteContact,
    getMyContacts
}; 