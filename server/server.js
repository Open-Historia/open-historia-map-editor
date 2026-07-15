/*! Open Historia Map Editor — standalone server © 2026 Nicholas Krol, MIT (see src/Editor/LICENSE). */

// Minimal Express backend for the standalone map editor: it persists map
// documents and the basemap library, serves the vendored Fantasy Map Generator
// at /fmg, and proxies GitHub-hosted community basemaps/scenarios (which browsers
// can't fetch cross-origin). In production it also serves the built app (dist).

import express from "express";
import fs from "fs";
import path from "path";
import url from "url";
import {
  createMapEditorDocument,
  deleteMapEditorDocument,
  ensureMapEditorStore,
  getMapEditorCatalog,
  getMapEditorDocument,
  updateMapEditorDocument,
} from "./mapEditorStore.js";
import {
  createBasemap,
  deleteBasemap,
  ensureBasemapStore,
  getBasemapCatalog,
  getBasemapPayload,
} from "./basemapStore.js";
import { listFlags, createFlag, deleteFlag } from "./flagStore.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, "../dist");
const publicDir = path.join(__dirname, "../public");

const largeJsonParser = express.json({ limit: "2048mb" });

// Open API (a personal authoring tool). Blanket CORS so a dev server or another
// origin can reach it.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

ensureMapEditorStore();
ensureBasemapStore();

const sendError = (res, statusCode, error) => {
  const message = error instanceof Error ? error.message : String(error);
  res.status(statusCode).json({ error: message });
};

// ---- Community hub proxy (GitHub-hosted basemaps/scenarios) ---------------
const HUB_DOWNLOAD_HOSTS = new Set([
  "github.com",
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "user-images.githubusercontent.com",
  "user-attachments.githubusercontent.com",
]);
const HUB_MAX_BUNDLE_BYTES = 200 * 1024 * 1024;

app.get("/api/hub/file", async (req, res) => {
  try {
    const target = new URL(String(req.query.url ?? ""));
    if (target.protocol !== "https:" || !HUB_DOWNLOAD_HOSTS.has(target.hostname)) {
      return sendError(res, 400, new Error("Only GitHub-hosted files can be fetched."));
    }
    const upstream = await fetch(target, { redirect: "follow" });
    if (!upstream.ok) return sendError(res, 502, new Error(`Hub file fetch failed (HTTP ${upstream.status}).`));
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > HUB_MAX_BUNDLE_BYTES) return sendError(res, 413, new Error("File is too large."));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.send(buffer);
  } catch (error) {
    sendError(res, 502, error);
  }
});

// ---- Map editor documents -------------------------------------------------
app.get("/api/mapeditor/documents", (_req, res) => { try { res.json(getMapEditorCatalog()); } catch (e) { sendError(res, 500, e); } });
app.post("/api/mapeditor/documents", largeJsonParser, (req, res) => { try { res.status(201).json(createMapEditorDocument(req.body ?? {})); } catch (e) { sendError(res, 400, e); } });
app.get("/api/mapeditor/documents/:id", (req, res) => { try { res.json(getMapEditorDocument(req.params.id)); } catch (e) { sendError(res, 404, e); } });
app.put("/api/mapeditor/documents/:id", largeJsonParser, (req, res) => { try { res.json(updateMapEditorDocument(req.params.id, req.body ?? {})); } catch (e) { sendError(res, 400, e); } });
app.delete("/api/mapeditor/documents/:id", (req, res) => { try { res.json(deleteMapEditorDocument(req.params.id)); } catch (e) { sendError(res, 400, e); } });

// ---- Basemap library ("Your basemaps") ------------------------------------
app.get("/api/basemaps", (_req, res) => { try { res.json(getBasemapCatalog()); } catch (e) { sendError(res, 500, e); } });
app.post("/api/basemaps", largeJsonParser, (req, res) => { try { res.status(201).json(createBasemap(req.body ?? {})); } catch (e) { sendError(res, 400, e); } });
app.get("/api/basemaps/:id/payload", (req, res) => { try { res.json(getBasemapPayload(req.params.id)); } catch (e) { sendError(res, 404, e); } });
app.delete("/api/basemaps/:id", (req, res) => { try { res.json(deleteBasemap(req.params.id)); } catch (e) { sendError(res, 400, e); } });

// ---- Flag library ("My flags") --------------------------------------------
// No ensure*Store() call: unlike the stores above, flagStore creates its file
// lazily on first write and reads a missing one as an empty library.
app.get("/api/flags", (_req, res) => { try { res.json(listFlags()); } catch (e) { sendError(res, 500, e); } });
app.post("/api/flags", largeJsonParser, (req, res) => { try { res.status(201).json(createFlag(req.body ?? {})); } catch (e) { sendError(res, 400, e); } });
app.delete("/api/flags/:id", (req, res) => { try { res.json(deleteFlag(req.params.id)); } catch (e) { sendError(res, 400, e); } });

// ---- Vendored Fantasy Map Generator (Azgaar, MIT) at /fmg -----------------
// Fetched to ../fmg/dist by scripts/fetch-fmg.mjs; present only once vendored,
// otherwise the editor's Generate console reports FMG isn't ready.
const fmgDistDir = path.join(__dirname, "../fmg/dist");
if (fs.existsSync(fmgDistDir)) app.use("/fmg", express.static(fmgDistDir));

// ---- Static assets + built app --------------------------------------------
app.use(express.static(publicDir)); // /assets/* (seeds, colours) in dev and prod
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*splat", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

const httpServer = app.listen(PORT, () => {
  console.log(`Map editor server running at http://localhost:${PORT}`);
});
httpServer.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Set PORT=<other> and retry.`);
    process.exit(1);
  }
  throw error;
});
