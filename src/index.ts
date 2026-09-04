import 'dotenv/config';
import AgentAPI from "apminsight";
AgentAPI.config()

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import classRouter from "./routes/classes.js";
import departmentRouter from "./routes/departments.js";
import enrollmentRouter from "./routes/enrollments.js";
import subjectRouter from "./routes/subjects.js";
import userRouter from "./routes/users.js";
import registrationCodeRouter from "./routes/registration-codes.js";
import registerRouter from "./routes/register.js";
import reportsRouter from "./routes/reports.js";
import authMiddleware from "./middleware/auth.js";
import securityMiddleware from "./middleware/security.js";

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
 origin: process.env.FRONTEND_URL || "http://localhost:5173",
 methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
 allowedHeaders: ["Content-Type", "Authorization"],
 credentials: true,
}));

// Better Auth routes (public, before auth middleware)
app.use('/api/auth', toNodeHandler(auth));

app.use(authMiddleware);
app.use(securityMiddleware);

// All routes
app.use('/api/register', registerRouter);
app.use('/api/classes', classRouter);
app.use('/api/enrollments', enrollmentRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/subjects', subjectRouter);
app.use('/api/users', userRouter);
app.use('/api/registration-codes', registrationCodeRouter);
app.use('/api/reports', reportsRouter);

// Root route
app.get("/", (req: Request, res: Response) => {
	res.send({ message: "Hello, Welcome to the Classroom API!" });
});



app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});

