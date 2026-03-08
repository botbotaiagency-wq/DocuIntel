/**
 * Vercel serverless entry: run the Express app for /api and /api/*.
 * All other routes are served as static from public/ (SPA).
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
  const app = await getAppPromise();
  app(req, res);
};
