const mysql = require('mysql2');
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000
});

pool.on('error', (err) => {
    console.error('Database pool error:', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection was closed. Reconnecting...');
    }
});

const promisePool = pool.promise();

module.exports = {
    db: promisePool,
    cloudinary
};