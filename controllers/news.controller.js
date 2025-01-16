const db = require('../config/db.config');

// Lấy tất cả tin tức (có phân trang và lọc)
const getAllNews = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            status = 'published',
            search
        } = req.query;

        const offset = (page - 1) * limit;
        // Đơn giản hóa điều kiện WHERE
        const conditions = ['is_active = true', 'status = "published"'];
        const values = [];

        if (category) {
            conditions.push('category = ?');
            values.push(category);
        }

        if (search) {
            conditions.push('(title LIKE ? OR content LIKE ?)');
            values.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // Debug query
        const countQuery = `SELECT COUNT(*) as total FROM news ${whereClause}`;
        console.log('Count Query:', countQuery);
        console.log('Count Values:', values);

        // Lấy tổng số tin tức
        const [countResult] = await db.query(countQuery, values);
        const total = countResult[0].total;

        // Query lấy tin tức với JOIN
        const newsQuery = `
            SELECT 
                n.*,
                u.full_name as author_name 
            FROM news n 
            LEFT JOIN users u ON n.author_id = u.id 
            ${whereClause}
            ORDER BY n.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        console.log('News Query:', newsQuery);
        console.log('News Values:', [...values, parseInt(limit), offset]);

        const [news] = await db.query(newsQuery, [...values, parseInt(limit), offset]);

        // Log kết quả để debug
        console.log('Total news found:', total);
        console.log('News returned:', news.length);
        console.log('First news:', news[0]);

        res.json({
            success: true,
            data: news,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all news error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Lấy chi tiết tin tức
const getNewsById = async (req, res) => {
    try {
        const newsId = req.params.id;

        // Tăng view_count và lấy thông tin tin tức
        await db.query('START TRANSACTION');

        try {
            await db.query(
                'UPDATE news SET view_count = view_count + 1 WHERE id = ?',
                [newsId]
            );

            const [news] = await db.query(
                `SELECT n.*, u.full_name as author_name 
                FROM news n 
                LEFT JOIN users u ON n.author_id = u.id 
                WHERE n.id = ? AND n.is_active = true`,
                [newsId]
            );

            if (news.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'News not found'
                });
            }

            await db.query('COMMIT');

            res.json({
                success: true,
                data: news[0]
            });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Get news by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Thêm tin tức mới (Admin only)
const addNews = async (req, res) => {
    try {
        const { title, content, category, status } = req.body;
        const is_featured = req.body.is_featured === '1';
        const author_id = req.user.id;

        // Validate category
        const validCategories = ['announcements', 'events', 'updates'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }

        // Validate status
        const validStatuses = ['draft', 'published'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Xử lý ảnh upload
        let image_url = null;
        if (req.files && req.files.news_image && req.files.news_image[0]) {
            image_url = '/uploads/news/' + req.files.news_image[0].filename;
            console.log('Image URL:', image_url); // Debug
        }

        let event_image_url = null;
        if (req.files && req.files.event_image && req.files.event_image[0]) {
            event_image_url = '/uploads/events/' + req.files.event_image[0].filename;
            console.log('Event Image URL:', event_image_url); // Debug
        }

        const [result] = await db.query(
            `INSERT INTO news (
                title,
                content,
                image_url,
                event_image_url,
                category,
                status,
                author_id,
                is_featured,
                published_at,
                created_at,
                updated_at,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), true)`,
            [
                title,
                content,
                image_url,
                event_image_url,
                category,
                status,
                author_id,
                is_featured,
                status === 'published' ? new Date() : null
            ]
        );

        console.log('Insert result:', result); // Debug

        if (result.affectedRows > 0) {
            res.status(201).json({
                success: true,
                message: 'News created successfully',
                data: {
                    id: result.insertId,
                    image_url: image_url,
                    event_image_url: event_image_url
                }
            });
        } else {
            throw new Error('Failed to insert news');
        }

    } catch (error) {
        console.error('Add news error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Cập nhật tin tức (Admin only)
const updateNews = async (req, res) => {
    try {
        const newsId = req.params.id;
        const { title, content, category, status } = req.body;
        const is_featured = req.body.is_featured === '1';

        // Xử lý ảnh upload mới
        let image_url = null;
        if (req.files && req.files.news_image && req.files.news_image[0]) {
            image_url = '/uploads/news/' + req.files.news_image[0].filename;
            console.log('New image URL:', image_url); // Debug
        }

        let event_image_url = null;
        if (req.files && req.files.event_image && req.files.event_image[0]) {
            event_image_url = '/uploads/events/' + req.files.event_image[0].filename;
            console.log('New event image URL:', event_image_url); // Debug
        }

        const updates = [];
        const values = [];

        // Thêm các trường cần update
        if (title) {
            updates.push('title = ?');
            values.push(title);
        }
        if (content) {
            updates.push('content = ?');
            values.push(content);
        }
        if (image_url) {
            updates.push('image_url = ?');
            values.push(image_url);
        }
        if (event_image_url) {
            updates.push('event_image_url = ?');
            values.push(event_image_url);
        }
        if (category) {
            updates.push('category = ?');
            values.push(category);
        }
        if (status) {
            updates.push('status = ?');
            values.push(status);
        }
        updates.push('is_featured = ?');
        values.push(is_featured);
        updates.push('updated_at = NOW()');

        values.push(newsId);

        const query = `UPDATE news SET ${updates.join(', ')} WHERE id = ?`;
        console.log('Update query:', query); // Debug
        console.log('Update values:', values); // Debug

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found'
            });
        }

        res.json({
            success: true,
            message: 'News updated successfully',
            data: {
                image_url: image_url,
                event_image_url: event_image_url
            }
        });
    } catch (error) {
        console.error('Update news error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Xóa tin tức (Admin only - soft delete)
const deleteNews = async (req, res) => {
    try {
        const newsId = req.params.id;

        const [result] = await db.query(
            'UPDATE news SET is_active = false WHERE id = ?',
            [newsId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'News not found'
            });
        }

        res.json({
            success: true,
            message: 'News deleted successfully'
        });
    } catch (error) {
        console.error('Delete news error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllNews,
    getNewsById,
    addNews,
    updateNews,
    deleteNews
};