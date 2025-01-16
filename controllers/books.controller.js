const db = require('../config/db.config');
const { notifyNewBook } = require('./notifications.controller');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Thêm middleware xử lý upload cả image và PDF
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath = 'public/uploads/books';
      if (file.fieldname === 'preview_pdf') {
        uploadPath = 'public/uploads/pdfs';
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'preview_pdf') {
      if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Only PDF files are allowed!'), false);
      }
    }
    cb(null, true);
  }
});

// Tạo thư mục uploads/pdfs nếu chưa tồn tại
const pdfUploadDir = path.join(__dirname, '../public/uploads/pdfs');
if (!fs.existsSync(pdfUploadDir)) {
  fs.mkdirSync(pdfUploadDir, { recursive: true });
}

// Get all books
const getAllBooks = async (req, res) => {
    try {
        const [books] = await db.query('SELECT * FROM books ORDER BY created_at DESC');
        res.json({
            success: true,
            data: books
        });
    } catch (error) {
        console.error('Get all books error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get book by ID
const getBookById = async (req, res) => {
    try {
        const [books] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        
        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        res.json({
            success: true,
            data: books[0]
        });
    } catch (error) {
        console.error('Get book by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Add new book
const addBook = async (req, res) => {
    try {
        const { 
            title, 
            author, 
            isbn, 
            quantity, 
            category, 
            publisher, 
            publish_year, 
            description 
        } = req.body;

        // Validate required fields
        if (!title || !author || !isbn || !quantity || !category) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Xử lý image_url nếu có file upload
        const image_url = req.file ? `/uploads/books/${req.file.filename}` : null;

        // Xử lý PDF nếu có
        const preview_pdf = req.files['preview_pdf'] ? 
            `/uploads/pdfs/${req.files['preview_pdf'][0].filename}` : null;

        // Check if ISBN already exists
        const [existingBook] = await db.query('SELECT id FROM books WHERE isbn = ?', [isbn]);
        if (existingBook.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Book with this ISBN already exists'
            });
        }

        const [result] = await db.query(
            `INSERT INTO books (
                title, author, isbn, quantity, available_quantity, 
                category, publisher, publish_year, description, 
                image_url, preview_pdf
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, author, isbn, quantity, quantity,
                category, publisher, publish_year, description, 
                image_url, preview_pdf
            ]
        );

        const newBook = {
            id: result.insertId,
            title,
            author,
            isbn,
            quantity,
            category,
            publisher,
            publish_year,
            description,
            image_url
        };
        await notifyNewBook(newBook);

        res.status(201).json({
            success: true,
            message: 'Book added successfully',
            data: newBook
        });
    } catch (error) {
        console.error('Add book error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Update book
const updateBook = async (req, res) => {
    try {
        const { 
            title, 
            author, 
            quantity, 
            category, 
            publisher, 
            publish_year, 
            description 
        } = req.body;

        // Check if book exists
        const [existingBook] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        if (existingBook.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        const book = existingBook[0];
        
        // Tính toán available_quantity mới
        const newQuantity = parseInt(quantity) || book.quantity;
        const borrowedBooks = book.quantity - book.available_quantity;
        const newAvailableQuantity = Math.max(0, newQuantity - borrowedBooks);

        // Xử lý image_url nếu có file upload mới
        let image_url = book.image_url;
        if (req.file) {
            // Xóa ảnh cũ nếu có
            if (book.image_url) {
                const oldImagePath = path.join(__dirname, '../public', book.image_url);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            image_url = `/uploads/books/${req.file.filename}`;
        }

        // Xử lý PDF nếu có file mới
        let preview_pdf = book.preview_pdf;
        if (req.files && req.files['preview_pdf']) {
            // Xóa file PDF cũ nếu có
            if (book.preview_pdf) {
                const oldPdfPath = path.join(__dirname, '../public', book.preview_pdf);
                if (fs.existsSync(oldPdfPath)) {
                    fs.unlinkSync(oldPdfPath);
                }
            }
            preview_pdf = `/uploads/pdfs/${req.files['preview_pdf'][0].filename}`;
        }

        await db.query(
            `UPDATE books SET 
                title = ?, 
                author = ?, 
                quantity = ?, 
                available_quantity = ?,
                category = ?, 
                publisher = ?, 
                publish_year = ?, 
                description = ?,
                image_url = ?,
                preview_pdf = ?
            WHERE id = ?`,
            [
                title || book.title,
                author || book.author,
                newQuantity,
                newAvailableQuantity,
                category || book.category,
                publisher || book.publisher,
                publish_year || book.publish_year,
                description || book.description,
                image_url,
                preview_pdf,
                req.params.id
            ]
        );

        res.json({
            success: true,
            message: 'Book updated successfully',
            data: {
                ...book,
                title: title || book.title,
                author: author || book.author,
                quantity: newQuantity,
                available_quantity: newAvailableQuantity,
                category: category || book.category,
                publisher: publisher || book.publisher,
                publish_year: publish_year || book.publish_year,
                description: description || book.description,
                image_url
            }
        });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Delete book
const deleteBook = async (req, res) => {
    try {
        // Kiểm tra xem sách có tồn tại không
        const [existingBook] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        
        if (existingBook.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sách'
            });
        }

        // Thực hiện xóa sách
        const [result] = await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Không thể xóa sách'
            });
        }

        res.json({
            success: true,
            message: 'Xóa sách thành công'
        });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa sách'
        });
    }
};

// Search books
const searchBooks = async (req, res) => {
    try {
        const { keyword = '' } = req.query;
        
        let query = `
            SELECT * FROM books 
            WHERE title LIKE ? 
            OR author LIKE ? 
            OR isbn LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
        `;
        
        const searchTerm = `%${keyword}%`;
        const params = [searchTerm, searchTerm, searchTerm];

        const [books] = await db.query(query, params);

        res.json({
            success: true,
            data: {
                books
            }
        });
    } catch (error) {
        console.error('Search books error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            data: {
                books: []
            }
        });
    }
};

// Thêm hàm mới để xem PDF
const getBookPreview = async (req, res) => {
    try {
        const [book] = await db.query('SELECT preview_pdf FROM books WHERE id = ?', [req.params.id]);
        if (!book[0] || !book[0].preview_pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }
        const pdfPath = path.join(__dirname, '../public', book[0].preview_pdf);
        
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ message: 'PDF file not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(pdfPath);
    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).json({ message: 'Error retrieving PDF' });
    }
};

// Thêm hàm mới để lấy sách theo category
const getBooksByCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        console.log('Fetching books for category:', categoryId);
        
        const [books] = await db.query(
            'SELECT * FROM books WHERE category_id = ? ORDER BY created_at DESC',
            [categoryId]
        );
        
        console.log('Found books:', books);
        
        res.json({
            success: true,
            data: books
        });
    } catch (error) {
        console.error('Get books by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllBooks,
    getBookById,
    addBook,
    updateBook,
    deleteBook,
    searchBooks,
    getBookPreview,
    getBooksByCategory
}; 