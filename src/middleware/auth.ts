import type { Request, Response, NextFunction } from "express";
import { db, session as sessionTable, user } from "../db/index.js";
import { eq } from "drizzle-orm";

type UserRole = "admin" | "teacher" | "student";
const validRoles: UserRole[] = ["admin", "teacher", "student"];

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.cookies?.["better-auth.session_token"] ||
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace("Bearer ", "")
      : undefined);

  if (token) {
    try {
      const foundSession = await db.query.session.findFirst({
        where: (fields, { eq }) => eq(fields.token, token),
        with: { user: true },
      });

      if (foundSession && foundSession.user) {
        const role = foundSession.user.role;
        if (validRoles.includes(role as UserRole)) {
          req.user = {
            id: foundSession.user.id,
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
