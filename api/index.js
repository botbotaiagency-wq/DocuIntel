/**
 * Vercel serverless entry: run the Express app for /api and /api/*.
 * Middleware sets x-vercel-original-path so we restore req.url after rewrite.
 */
const path = require("path");

// Built server exports getApp (async); it does not listen when VERCEL is set.
const { getApp } = require(path.join(__dirname, "..", "dist", "index.cjs"));

let appPromise = null;

function getAppPromise() {
  if (!appPromise) appPromise = getApp();
  return appPromise;
}

module.exports = async (req, res) => {
  const originalPath = req.headers["x-vercel-original-path"];
  if (originalPath) {
    const q = req.url && req.url.includes("?") ? "?" + req.url.split("?").slice(1).join("?") : "";
    req.url = originalPath + q;
  }
  try {
    const app = await getAppPromise();
    app(req, res);
  } catch (err) {
    console.error("API startup error:", err);
    const msg = err && err.message ? err.message : "Server configuration error";
    const isDbMissing = /DATABASE_URL|POSTGRES_URL/i.test(msg) || /database.*not set/i.test(msg);
    res.status(isDbMissing ? 503 : 500).json({
      message: isDbMissing
        ? "DATABASE_URL or POSTGRES_URL is not set. Link Supabase in Vercel (sets POSTGRES_URL) or add DATABASE_URL."
        : msg,
    });
  }
};
