import { Schema, model, type Types } from "mongoose";

export const IMAGE_EXTS = ["jpg", "png", "webp", "gif"] as const;

export interface ImageDoc {
  _id: Types.ObjectId;
  restaurant: Types.ObjectId;
  ext: (typeof IMAGE_EXTS)[number];
  data: Buffer;
}

const imageSchema = new Schema<ImageDoc>(
  {
    restaurant: { type: Schema.Types.ObjectId, required: true, index: true },
    ext: { type: String, enum: IMAGE_EXTS, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const Image = model<ImageDoc>("Image", imageSchema);