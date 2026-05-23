const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const taskUploadsDir = path.join(__dirname, '../../uploads/tasks');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(taskUploadsDir)) fs.mkdirSync(taskUploadsDir);

// Avatar storage
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadsDir); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Task file storage
const taskStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, taskUploadsDir); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'task-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) { cb(null, true); }
  else { cb(new Error('Invalid file type. Only images are allowed.')); }
};

const anyFileFilter = (req, file, cb) => { cb(null, true); };

const upload = multer({ storage: avatarStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadTaskFile = multer({ storage: taskStorage, fileFilter: anyFileFilter, limits: { fileSize: 10 * 1024 * 1024 } }).single('file');

module.exports = { upload, uploadTaskFile };
