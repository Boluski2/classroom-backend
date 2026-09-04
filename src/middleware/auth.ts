import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

type UserRole = "admin" | "teacher" | "student";
const validRoles: UserRole[] = ["admin", "teacher", "student"];

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.cookies?.["better-auth.session_token"] ||
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace("Bearer ", "")
      : undefined);

  if (token) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (session?.user) {
        const role = session.user.role;
        if (validRoles.includes(role as UserRole)) {
          req.user = {
            id: session.user.id,
            role: role as UserRole,
          };
        }
      }
    } catch (error) {
      console.error("Auth middleware error:", error);
    }
  }

  next();
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
};

export default authMiddleware;
