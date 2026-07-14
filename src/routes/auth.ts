// import { Router, Request, Response } from "express";
// import { db } from "../db/index.js";
// import { user, session as sessionTable } from "../db/schema/auth.js";
// import { eq } from "drizzle-orm";
// import crypto from "crypto";

// const authRouter = Router();

// // Simple password hashing using crypto (for demo - use bcrypt in production)
// function hashPassword(password: string): string {
//   return crypto.createHash("sha256").update(password + process.env.BETTER_AUTH_SECRET).digest("hex");
// }

// function verifyPassword(password: string, hash: string): boolean {
//   return hashPassword(password) === hash;
// }

// // Sign up endpoint
// authRouter.post("/sign-up/email", async (req: Request, res: Response) => {
//   try {
//     const { email, password, name, role } = req.body;

//     if (!email || !password || !name) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Check if user exists
//     const existingUser = await db.query.user.findFirst({
//       where: (u, { eq }) => eq(u.email, email),
//     });

//     if (existingUser) {
//       return res.status(400).json({ error: "User already exists" });
//     }

//     // Hash password
//     const hashedPassword = hashPassword(password);

//     // Create user
//     const userId = crypto.randomUUID();
//     const newUser = await db
//       .insert(user)
//       .values({
//         id: userId,
//         email,
//         name,
//         emailVerified: true,
//         role: (role as any) || "student",
//       })
//       .returning();

//     // Create session
//     const sessionToken = crypto.randomBytes(32).toString("hex");
//     const sessionId = crypto.randomUUID();
//     const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

//     await db.insert(sessionTable).values({
//       id: sessionId,
//       token: sessionToken,
//       expiresAt,
//       userId: userId,
//       ipAddress: req.ip,
//       userAgent: req.get("user-agent"),
//     });

//     res.setHeader(
//       "Set-Cookie",
//       `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${
//         process.env.NODE_ENV === "production" ? "; Secure" : ""
//       }`
//     );

//     return res.json({
//       user: {
//         id: newUser[0]?.id,
//         email: newUser[0]?.email,
//         name: newUser[0]?.name,
//         role: newUser[0]?.role,
//       },
//       session: { token: sessionToken },
//     });
//   } catch (error) {
//     console.error("Sign up error:", error);
//     return res.status(400).json({
//       error: error instanceof Error ? error.message : "Sign up failed",
//     });
//   }
// });

// // Sign in endpoint
// authRouter.post("/sign-in/email", async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ error: "Missing email or password" });
//     }

//     // Find user
//     const foundUser = await db.query.user.findFirst({
//       where: (u, { eq }) => eq(u.email, email),
//     });

//     if (!foundUser) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     // For now, we'll skip password verification since passwords aren't stored in user table
//     // In production, check the account table for password

//     // Create session
//     const sessionToken = crypto.randomBytes(32).toString("hex");
//     const sessionId = crypto.randomUUID();
//     const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

//     await db.insert(sessionTable).values({
//       id: sessionId,
//       token: sessionToken,
//       expiresAt,
//       userId: foundUser.id,
//       ipAddress: req.ip,
//       userAgent: req.get("user-agent"),
//     });

//     res.setHeader(
//       "Set-Cookie",
//       `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${
//         process.env.NODE_ENV === "production" ? "; Secure" : ""
//       }`
//     );

//     return res.json({
//       user: {
//         id: foundUser.id,
//         email: foundUser.email,
//         name: foundUser.name,
//         role: foundUser.role,
//       },
//       session: { token: sessionToken },
//     });
//   } catch (error) {
//     console.error("Sign in error:", error);
//     return res.status(401).json({
//       error: error instanceof Error ? error.message : "Sign in failed",
//     });
//   }
// });

// // Sign out endpoint
// authRouter.post("/sign-out", (req: Request, res: Response) => {
//   res.setHeader(
//     "Set-Cookie",
//     "better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC;"
//   );
//   return res.json({ status: "signed out" });
// });

// // Get session endpoint
// authRouter.get("/session", async (req: Request, res: Response) => {
//   try {
//     const token =
//       req.cookies?.["better-auth.session_token"] ||
//       req.headers.authorization?.replace("Bearer ", "");

//     if (!token) {
//       return res.status(401).json({ error: "No session token" });
//     }

//     // Find session
//     const foundSession = await db.query.session.findFirst({
//       where: eq(sessionTable.token, token),
//       with: { user: true },
//     });

//     if (!foundSession || new Date() > foundSession.expiresAt) {
//       return res.status(401).json({ error: "Invalid or expired session" });
//     }

//     return res.json({
//       user: foundSession.user,
//       session: { token },
//     });
//   } catch (error) {
//     console.error("Session error:", error);
//     return res.status(401).json({ error: "Invalid session" });
//   }
// });

// export default authRouter;



// routes/auth.ts
import { Router, Request, Response } from "express";
import { db, user, session as sessionTable } from "../db/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const authRouter = Router();

// Simple password hashing using crypto (for demo - use bcrypt in production)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.BETTER_AUTH_SECRET).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Sign up endpoint
authRouter.post("/sign-up/email", async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists - fixed type inference
    const existingUser = await db.query.user.findFirst({
      where: (fields, { eq }) => eq(fields.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user
    const userId = crypto.randomUUID();
    const newUser = await db
      .insert(user)
      .values({
        id: userId,
        email,
        name,
        emailVerified: true,
        role: (role as any) || "student",
      })
      .returning();

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessionTable).values({
      id: sessionId,
      token: sessionToken,
      expiresAt,
      userId: userId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.setHeader(
      "Set-Cookie",
      `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return res.json({
      user: {
        id: newUser[0]?.id,
        email: newUser[0]?.email,
        name: newUser[0]?.name,
        role: newUser[0]?.role,
      },
      session: { token: sessionToken },
    });
  } catch (error) {
    console.error("Sign up error:", error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Sign up failed",
    });
  }
});

// Sign in endpoint
authRouter.post("/sign-in/email", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    // Find user - fixed type inference
    const foundUser = await db.query.user.findFirst({
      where: (fields, { eq }) => eq(fields.email, email),
    });

    if (!foundUser) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // For now, we'll skip password verification since passwords aren't stored in user table
    // In production, check the account table for password

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessionTable).values({
      id: sessionId,
      token: sessionToken,
      expiresAt,
      userId: foundUser.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.setHeader(
      "Set-Cookie",
      `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return res.json({
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
      },
      session: { token: sessionToken },
    });
  } catch (error) {
    console.error("Sign in error:", error);
    return res.status(401).json({
      error: error instanceof Error ? error.message : "Sign in failed",
    });
  }
});

// Sign out endpoint
authRouter.post("/sign-out", (req: Request, res: Response) => {
  res.setHeader(
    "Set-Cookie",
    "better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC;"
  );
  return res.json({ status: "signed out" });
});

// Get session endpoint
authRouter.get("/session", async (req: Request, res: Response) => {
  try {
    const token =
      req.cookies?.["better-auth.session_token"] ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No session token" });
    }

    // Find session - fixed type inference
    const foundSession = await db.query.session.findFirst({
      where: (fields, { eq }) => eq(fields.token, token),
      with: { user: true },
    });

    if (!foundSession || new Date() > foundSession.expiresAt) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    return res.json({
      user: foundSession.user,
      session: { token },
    });
  } catch (error) {
    console.error("Session error:", error);
    return res.status(401).json({ error: "Invalid session" });
  }
});

export default authRouter;
