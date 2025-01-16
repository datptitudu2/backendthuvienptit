const db = require('../config/db.config');
const fs = require('fs').promises;
const path = require('path');
const { logActivity } = require('./activity.controller');

// Lấy thông tin profile (thêm avatar_url vào SELECT)
const getProfile = async (req, res) => {
    try {
        const [user] = await db.query(
            `SELECT 
                id, 
                email, 
                phone, 
                full_name, 
                role, 
                COALESCE(avatar_url, '/uploads/avatars/default-avatar.jpg') as avatar_url, 
                created_at 
            FROM users 
            WHERE id = ?`,
            [req.user.id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Đảm bảo avatar_url luôn có giá trị
        user[0].avatar_url = user[0].avatar_url || '/uploads/avatars/default-avatar.png';

        res.json({
            success: true,
            data: user[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Thêm mới: Cập nhật avatar
const updateAvatar = async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ảnh avatar'
            });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Cập nhật avatar mới
        await db.query(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [avatarUrl, userId]
        );

        // Lấy thông tin user mới nhất
        const [updatedUser] = await db.query(
            'SELECT id, email, phone, full_name, role, avatar_url, created_at FROM users WHERE id = ?',
            [userId]
        );

        await logActivity(
            userId,
            'avatar_update',
            'Cập nhật ảnh đại diện',
            req
        );

        res.json({
            success: true,
            message: 'Cập nhật avatar thành công',
            data: {
                avatar_url: avatarUrl,
                user: updatedUser[0] // Trả về toàn bộ thông tin user
            }
        });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Cập nhật thông tin profile
const updateProfile = async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const user_id = req.user.id;

        // Validate dữ liệu đầu vào
        if (!full_name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }

        // Validate số điện thoại (Việt Nam)
        const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ'
            });
        }

        // Kiểm tra số điện thoại đã tồn tại
        const [existingPhone] = await db.query(
            'SELECT id FROM users WHERE phone = ? AND id != ?',
            [phone, user_id]
        );

        if (existingPhone.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại đã được sử dụng'
            });
        }

        // Cập nhật thông tin
        await db.query(
            'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
            [full_name, phone, user_id]
        );

        // Lấy thông tin user mới nhất
        const [updatedUser] = await db.query(
            'SELECT id, email, phone, full_name, role, avatar_url FROM users WHERE id = ?',
            [user_id]
        );

        await logActivity(
            user_id, 
            'profile_update',
            'Cập nhật thông tin cá nhân',
            req
        );

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công',
            data: updatedUser[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const user_id = req.user.id;

        // Validate input
        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }

        // Kiểm tra mật khẩu hiện tại
        const [user] = await db.query(
            'SELECT id FROM users WHERE id = ? AND password = ?',
            [user_id, current_password]
        );

        if (user.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Cập nhật mật khẩu mới
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [new_password, user_id]
        );

        await logActivity(
            user_id,
            'password_change',
            'Thay đổi mật khẩu',
            req
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    updateAvatar,
    changePassword
}; 