import type { Request, Response, NextFunction } from "express";

type UserRole = "admin" | "teacher" | "student";
const validRoles: UserRole[] = ["admin", "teacher", "student"];

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const roleHeader = req.headers["x-user-role"];
  const role = typeof roleHeader === "string" && validRoles.includes(roleHeader as UserRole)
    ? (roleHeader as UserRole)
    : undefined;

  if (role) {
    req.user = { role };
  }

  next();
};

export default authMiddleware;
