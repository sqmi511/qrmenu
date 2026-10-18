import { Types } from "mongoose";
import { Image } from "../models/Image.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/httpError.js";

const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" } as const;
type Ext = keyof typeof MIME;
const PARAM = /^[a-f\d]{24}$/i;
const FILE = /^([a-f\d]{24})\.(jpg|png|webp|gif)$/i;

/** Public: GET /uploads/:rid/:id.ext. Ids are unguessable and the restaurant must match. */
export const serveImage = asyncHandler(async (req, res) => {
  const rid = String(req.params.rid);
  const m = FILE.exec(String(req.params.file));
  if (!PARAM.test(rid) || !m) throw notFound("Image");

  const ext = m[2].toLowerCase() as Ext;
  const doc = await Image.findOne({
    _id: new Types.ObjectId(m[1]),
    restaurant: new Types.ObjectId(rid),
    ext,
  })
    .select("data")
    .lean<{ data: Buffer } | null>();
  if (!doc) throw notFound("Image");

  res.set({
    "Content-Type": MIME[ext],
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": "public, max-age=2592000, immutable",
  });
  res.send(Buffer.from(doc.data.buffer ?? doc.data));
});