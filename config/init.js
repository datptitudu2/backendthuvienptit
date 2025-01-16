const fs = require('fs');
const path = require('path');

// Tạo các thư mục cần thiết
const createRequiredDirectories = () => {
  const directories = [
    'public/uploads/books',
    'public/uploads/news',  // Thêm thư mục cho news
    'public/uploads/pdfs'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

module.exports = { createRequiredDirectories }; 