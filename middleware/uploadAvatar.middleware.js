const multer = require('multer');

// Chuyển sang memory storage để upload lên Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
};

const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // giới hạn 2MB
  },
  fileFilter: fileFilter
});

module.exports = uploadAvatar;