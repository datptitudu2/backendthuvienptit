const db = require('../config/db.config');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activity.controller');

const register = async (req, res) => {
    try {
        const { email, phone, password, full_name } = req.body;

        // Validate input
        if (!email || !phone || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ'
            });
        }

        // Validate phone format (10 digits, starting with 0)
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ'
            });
        }

        // Check if email or phone already exists
        const [existingUser] = await db.query(
            'SELECT * FROM users WHERE email = ? OR phone = ?',
            [email, phone]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email hoặc số điện thoại đã tồn tại'
            });
        }

        // Insert new user
        const [result] = await db.query(
            'INSERT INTO users (email, phone, password, full_name, role) VALUES (?, ?, ?, ?, "user")',
            [email, phone, password, full_name]
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: {
                id: result.insertId,
                email,
                phone,
                full_name,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

const login = async (req, res) => {
    try {
        const { login_id, password } = req.body;

        // Validate input
        if (!login_id || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email/phone and password'
            });
        }

        // Check if user exists using email or phone
        const [users] = await db.query(
            'SELECT * FROM users WHERE (email = ? OR phone = ?) AND password = ?',
            [login_id, login_id, password]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Sai thông tin đăng nhập'
            });
        }

        const user = users[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Log hoạt động đăng nhập
        await logActivity(user.id, 'login', 'Đăng nhập vào hệ thống', req);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    full_name: user.full_name,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const logout = async (req, res) => {
    try {
        // Log hoạt động đăng xuất
        await logActivity(req.user.id, 'logout', 'Đăng xuất khỏi hệ thống', req);
        
        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        // ... xử lý lỗi ...
    }
};

module.exports = {
    register,
    login,
    logout
}; 