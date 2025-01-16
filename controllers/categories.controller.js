const db = require('../config/db.config');

// Lấy tất cả categories
const getAllCategories = async (req, res) => {
    try {
        const [categories] = await db.query(
            'SELECT * FROM categories WHERE is_active = true ORDER BY name ASC'
        );
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Lấy category theo ID
const getCategoryById = async (req, res) => {
    try {
        const [category] = await db.query(
            'SELECT * FROM categories WHERE id = ? AND is_active = true',
            [req.params.id]
        );

        if (category.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: category[0]
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Thêm category mới (Admin only)
const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Kiểm tra category đã tồn tại
        const [existingCategory] = await db.query(
            'SELECT id FROM categories WHERE name = ? AND is_active = true',
            [name]
        );

        if (existingCategory.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Category already exists'
            });
        }

        const [result] = await db.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                id: result.insertId,
                name,
                description
            }
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Cập nhật category (Admin only)
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        // Kiểm tra category tồn tại
        const [category] = await db.query(
            'SELECT * FROM categories WHERE id = ? AND is_active = true',
            [id]
        );

        if (category.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Kiểm tra tên mới có bị trùng không
        if (name && name !== category[0].name) {
            const [existingCategory] = await db.query(
                'SELECT id FROM categories WHERE name = ? AND id != ? AND is_active = true',
                [name, id]
            );

            if (existingCategory.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }
        }

        await db.query(
            'UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
            [name, description, id]
        );

        res.json({
            success: true,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Xóa category (Admin only - soft delete)
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Bước 1: Kiểm tra category có tồn tại không
        const [category] = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );

        if (category.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Bước 2: Kiểm tra có sách nào đang sử dụng category này không
        const [books] = await db.query(
            'SELECT COUNT(*) as count FROM books WHERE category_id = ?',
            [id]
        );

        if (books[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category because it is being used by books'
            });
        }

        // Bước 3: Thực hiện xóa (hard delete vì không có ràng buộc)
        const [result] = await db.query(
            'DELETE FROM categories WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete category'
            });
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
}; 