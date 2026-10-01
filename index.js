import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const GIF_DIR = path.join(DATA_DIR, "gifs");
const DB_FILE = path.join(DATA_DIR, "gifs.json");
const DIST_DIR = path.join(ROOT, "dist");

await fs.mkdir(GIF_DIR, { recursive: true });
if (!existsSync(DB_FILE)) {
  await fs.writeFile(DB_FILE, "[]", "utf8");
}

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 15 * 1024 * 1024);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, GIF_DIR),
  filename: (_req, file, cb) => {
    const id = crypto.randomUUID();
    cb(null, `${id}.gif`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "image/gif");
  }
});

async function readDb() {
  return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
}

async function writeDb(items) {
  await fs.writeFile(DB_FILE, JSON.stringify(items, null, 2), "utf8");
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/gifs", async (_req, res) => {
  try {
    const gifs = await readDb();
    res.json(gifs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch {
    res.status(500).json({ error: "Unable to read GIF library." });
  }
});

app.post("/api/upload", upload.single("gif"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload a GIF file." });
  }

  try {
    const id = path.basename(req.file.filename, ".gif");
    const record = {
      id,
      name: sanitizeName(req.file.originalname),
      size: req.file.size,
      createdAt: new Date().toISOString(),
      url: `/gifs/${req.file.filename}`
    };

    const gifs = await readDb();
    gifs.push(record);
    await writeDb(gifs);

    res.status(201).json(record);
  } catch {
    await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: "Unable to save GIF." });
  }
});

app.delete("/api/gifs/:id", async (req, res) => {
  const id = req.params.id;

  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "Invalid GIF ID." });
  }

  try {
    const gifs = await readDb();
    const target = gifs.find((gif) => gif.id === id);

    if (!target) {
      return res.status(404).json({ error: "GIF not found." });
    }

    const filename = path.basename(target.url);
    await fs.unlink(path.join(GIF_DIR, filename)).catch(() => {});
    await writeDb(gifs.filter((gif) => gif.id !== id));

    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Unable to delete GIF." });
  }
});

app.use("/gifs", express.static(GIF_DIR, {
  fallthrough: false,
  maxAge: "1h",
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}));

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/gifs/")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`GIF host running on http://localhost:${PORT}`);
});

function sanitizeName(name) {
  const cleaned = String(name || "upload.gif")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim();

  return cleaned.toLowerCase().endsWith(".gif") ? cleaned : `${cleaned}.gif`;
}
