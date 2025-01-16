const db = require('../config/db.config');

// Lấy tất cả rules
const getAllRules = async (req, res) => {
    try {
        const [rules] = await db.query(
            'SELECT * FROM rules WHERE is_active = true ORDER BY id ASC'
        );
        res.json({
            success: true,
            data: rules
        });
    } catch (error) {
        console.error('Get all rules error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Lấy rule theo id
const getRuleById = async (req, res) => {
    try {
        const [rules] = await db.query(
            'SELECT * FROM rules WHERE id = ? AND is_active = true',
            [req.params.id]
        );

        if (rules.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rule not found'
            });
        }

        res.json({
            success: true,
            data: rules[0]
        });
    } catch (error) {
        console.error('Get rule by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Thêm rule mới (Admin only)
const addRule = async (req, res) => {
    try {
        const { rule_name, rule_value, description } = req.body;

        // Validate input
        if (!rule_name || !rule_value) {
            return res.status(400).json({
                success: false,
                message: 'Please provide rule name and value'
            });
        }

        // Kiểm tra rule_name đã tồn tại chưa
        const [existingRule] = await db.query(
            'SELECT id FROM rules WHERE rule_name = ? AND is_active = true',
            [rule_name]
        );

        if (existingRule.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Rule name already exists'
            });
        }

        // Insert rule mới
        const [result] = await db.query(
            'INSERT INTO rules (rule_name, rule_value, description) VALUES (?, ?, ?)',
            [rule_name, JSON.stringify(rule_value), description]
        );

        res.status(201).json({
            success: true,
            message: 'Rule added successfully',
            data: {
                id: result.insertId,
                rule_name,
                rule_value,
                description
            }
        });
    } catch (error) {
        console.error('Add rule error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Cập nhật rule (Admin only)
const updateRule = async (req, res) => {
    try {
        const id = req.params.id;
        const { rule_value, description, is_active } = req.body;

        // Kiểm tra rule có tồn tại không
        const [existingRule] = await db.query(
            'SELECT * FROM rules WHERE id = ?',
            [id]
        );

        if (existingRule.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rule not found'
            });
        }

        // Không cho phép cập nhật các rule mặc định
        if (existingRule[0].is_default) {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify default rules'
            });
        }

        // Chuẩn bị dữ liệu cập nhật
        const updates = [];
        const values = [];

        if (rule_value !== undefined) {
            updates.push('rule_value = ?');
            values.push(JSON.stringify(rule_value));
        }

        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data provided for update'
            });
        }

        // Thực hiện cập nhật
        values.push(id);
        await db.query(
            `UPDATE rules SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Lấy dữ liệu đã cập nhật
        const [updatedRule] = await db.query(
            'SELECT * FROM rules WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Rule updated successfully',
            data: updatedRule[0]
        });
    } catch (error) {
        console.error('Update rule error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Xóa rule (Admin only - soft delete)
const deleteRule = async (req, res) => {
    try {
        const id = req.params.id;

        // Kiểm tra rule có tồn tại không
        const [existingRule] = await db.query(
            'SELECT * FROM rules WHERE id = ?',
            [id]
        );

        if (existingRule.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rule not found'
            });
        }

        // Không cho phép xóa các rule mặc định
        if (existingRule[0].is_default) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete default rules'
            });
        }

        // Soft delete
        await db.query(
            'UPDATE rules SET is_active = false WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Rule deleted successfully'
        });
    } catch (error) {
        console.error('Delete rule error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllRules,
    getRuleById,
    addRule,
    updateRule,
    deleteRule
};