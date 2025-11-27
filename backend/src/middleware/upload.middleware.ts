import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Get uploads directory from environment variable (set by Electron) or use default
// In Electron, this will be the userData directory
// In development, this will be process.cwd()
const baseUploadsPath = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
const uploadsDir = path.join(baseUploadsPath, 'avatars');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('📁 Avatar upload directory:', uploadsDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Configure multer
export const uploadAvatar = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Get avatar URL helper
export function getAvatarUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  // Return relative path that can be served statically
  return `/uploads/avatars/${filename}`;
}

