/**
 * Security test: document export endpoint.
 * Negative test: unauthenticated request must receive 401.
 * Run: npm run test:export (sets NODE_TEST=1 so server does not start on import)
 */
import test from "node:test";
import assert from "node:assert";
import request from "supertest";

// NODE_TEST=1 is set by npm script so server/index does not call listen()
const { getApp } = await import("../server/index.js");

test("GET /api/documents/:id/export without auth returns 401", async () => {
  const app = await getApp();
  const res = await request(app).get("/api/documents/1/export");
  assert.strictEqual(res.status, 401, "Unauthenticated request must get 401");
});

