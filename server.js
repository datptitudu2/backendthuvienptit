require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { checkDueBooks, checkLowStock, checkOverdueBooks, notifyNewBook } = require('./controllers/notifications.controller');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth.routes');
const booksRoutes = require('./routes/books.routes');
const borrowsRoutes = require('./routes/borrows.routes');
const rulesRoutes = require('./routes/rules.routes');
const newsRoutes = require('./routes/news.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const profileRoutes = require('./routes/profile.routes');
const servicesRoutes = require('./routes/services.routes');
const contactsRoutes = require('./routes/contacts.routes');
const categoriesRoutes = require('./routes/categories.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const notificationRoutes = require('./routes/notifications.routes');
const penaltiesRoutes = require('./routes/penalties.routes');
const activityRoutes = require('./routes/activity.routes');

// Import cron jobs
require('./utils/cronJobs');

const app = express();

// Cấu hình rate limit
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 phút
    max: 100, // Tối đa 100 request/phút
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Áp dụng rate limit cho toàn bộ API
app.use('/api', limiter);

// Hoặc áp dụng riêng cho từng route
const bookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu đến API sách, vui lòng thử lại sau'
    }
});
app.use('/api/books', bookLimiter);

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  next();
});

// Tạo thư mục để lưu avatars
const uploadDir = path.join(__dirname, 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware xử lý lỗi uplofad
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }
  
  if (err) {
    console.error('Upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during upload',
      error: err.message
    });
  }
  next();
});

// Serve static files với cấu hình CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/borrows', borrowsRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/penalties', penaltiesRoutes);
app.use('/api/activities', activityRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!'
    });
});

// Handle 404 - Phải đặt sau tất cả các routes khác
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware - Phải đặt sau tất cả các middleware khác
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Kiểm tra sách sắp hết hạn mỗi ngày lúc 9 giờ sáng
cron.schedule('0 9 * * *', async () => {
    console.log('Checking due books...');
    await checkDueBooks();
});

// Kiểm tra sách sắp hết mỗi 12 tiếng
cron.schedule('0 */12 * * *', async () => {
    console.log('Checking low stock books...');
    await checkLowStock();
});

// Kiểm tra sách quá hạn mỗi ngày
cron.schedule('0 0 * * *', async () => {
    console.log('Checking overdue books...');
    await checkOverdueBooks();
});

const PORT = process.env.PORT || 5000;

// Database connection test
const db = require('./config/db.config');

const startServer = async () => {
    try {
        // Test database connection
        await db.query('SELECT 1');
        console.log('Database connection successful');

        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

startServer();
