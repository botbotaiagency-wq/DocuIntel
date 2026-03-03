import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";

export function registerAuthRoutes(app: Express): void {
  /** Dev-only: when DB is unavailable, accept admin/admin123 to explore the UI. */
  const DEV_USER_ID = "dev_admin";
  const DEV_CREDENTIALS = { username: "admin", password: "admin123" };

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      try {
        const user = await authStorage.getUserByUsername(username);
        if (!user || !user.passwordHash) {
          if (process.env.NODE_ENV === "development" && username === DEV_CREDENTIALS.username && password === DEV_CREDENTIALS.password) {
            req.session.userId = DEV_USER_ID;
            req.session.save(() => {
              res.json({ id: DEV_USER_ID, username: DEV_CREDENTIALS.username, firstName: "Local Dev Admin", role: "Admin", displayName: "Local Dev Admin" });
            });
            return;
          }
          return res.status(401).json({ message: "Invalid username or password" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return res.status(401).json({ message: "Invalid username or password" });
        }

        req.session.userId = user.id;
        req.session.save(() => {
          const { passwordHash, ...safeUser } = user;
          res.json(safeUser);
        });
      } catch (dbError: any) {
        if (process.env.NODE_ENV === "development" && username === DEV_CREDENTIALS.username && password === DEV_CREDENTIALS.password) {
          req.session.userId = DEV_USER_ID;
          req.session.save(() => {
            res.json({ id: DEV_USER_ID, username: DEV_CREDENTIALS.username, firstName: "Local Dev Admin", role: "Admin", displayName: "Local Dev Admin" });
          });
          return;
        }
        throw dbError;
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (userId === DEV_USER_ID) {
        return res.json({ id: DEV_USER_ID, username: "admin", firstName: "Local Dev Admin", role: "Admin", displayName: "Local Dev Admin" });
      }
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const profile = await authStorage.getUserProfile(userId);
      const { passwordHash, ...safeUser } = user;
      res.json({ ...safeUser, role: profile?.role || "Viewer", displayName: profile?.displayName });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
