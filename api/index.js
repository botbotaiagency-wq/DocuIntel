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
  const app = await getAppPromise();
  app(req, res);
};
