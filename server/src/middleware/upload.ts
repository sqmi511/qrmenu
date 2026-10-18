import multer from "multer";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
  // cheap first filter; the real check is the magic bytes in the controller
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
}).single("file");