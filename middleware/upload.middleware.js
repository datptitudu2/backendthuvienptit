const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo các thư mục upload nếu chưa tồn tại
const createUploadDirs = () => {
  const dirs = ['news', 'books', 'pdfs', 'events'].map(dir => 
    path.join(__dirname, '../public/uploads', dir)
  );
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    let uploadPath = path.join(__dirname, '../public/uploads');
    
    // Xác định thư mục lưu trữ dựa vào loại file
    if (file.fieldname === 'news_image') {
      uploadPath = path.join(uploadPath, 'news');
    } else if (file.fieldname === 'book_image') {
      uploadPath = path.join(uploadPath, 'books');
    } else if (file.fieldname === 'preview_pdf') {
      uploadPath = path.join(uploadPath, 'pdfs');
    } else if (file.fieldname === 'event_image') {
      uploadPath = path.join(uploadPath, 'events');
    }
    
    console.log('Upload path:', uploadPath);
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('Processing file:', file);
  if (file.fieldname === 'preview_pdf') {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed!'), false);
    }
  } else {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;