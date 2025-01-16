const cron = require('node-cron');
const { checkDueBooks } = require('../controllers/notifications.controller');

// Chạy mỗi ngày lúc 8 giờ sáng
cron.schedule('0 8 * * *', async () => {
    console.log('Checking due books...');
    await checkDueBooks();
}); 