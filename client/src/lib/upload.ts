import { api } from "./api";
import { prepareImage } from "./image";

/** Uploads an image and returns its stored path (/uploads/...). */
export async function uploadImage(file: File, signal?: AbortSignal) {
  const blob = await prepareImage(file);
  const form = new FormData();
  form.append("file", blob, blob instanceof File ? blob.name : "image.webp");
  const { data } = await api.post<{ data: { url: string } }>("/uploads/image", form, { timeout: 60_000, signal });
  return data.data.url;
}