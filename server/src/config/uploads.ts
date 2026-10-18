import path from "node:path";

// run the server from server\ (npm run dev does)
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");