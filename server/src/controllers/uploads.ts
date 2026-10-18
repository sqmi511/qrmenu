import { tenantId } from "../middleware/auth.js";
import { Image } from "../models/Image.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { detectImage } from "../utils/imageType.js";

const MAX_IMAGES = 300;

export const uploadImage = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw new HttpError(400, "Choose a JPEG, PNG, WebP or GIF image");
  const ext = detectImage(file.buffer);
  if (!ext) throw new HttpError(400, "Only JPEG, PNG, WebP or GIF images are allowed");

  const rid = tenantId(res); // the owner comes from the session, never from the request
  if ((await Image.countDocuments({ restaurant: rid })) >= MAX_IMAGES) {
    throw new HttpError(400, "Image limit reached. Delete unused items or contact us.");
  }

  const doc = await Image.create({ restaurant: rid, ext, data: file.buffer });
  res.status(201).json({ data: { url: `/uploads/${rid}/${doc._id}.${ext}` } });
});