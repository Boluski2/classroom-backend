import AgentAPI from "apminsight";
AgentAPI.config()

import express, { Request, Response } from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import { auth } from "./lib/auth.js";
import classRouter from "./routes/classes.js";
import departmentRouter from "./routes/departments.js";
import subjectRouter from "./routes/subjects.js";
import userRouter from "./routes/users.js";
import authMiddleware from "./middleware/auth.js";
import securityMiddleware from "./middleware/security.js";

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());
app.use(cors ({
 origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
 methods: ['GET', 'POST', 'PUT', 'DELETE'],
//  allowedHeaders: ['Content-Type', 'Authorization'],
 credentials: true,
}));

// Auth routes (public, before auth middleware)
app.use('/api/auth', authRouter);

app.use(authMiddleware);
app.use(securityMiddleware);

// All routes
app.use('/api/classes', classRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/subjects', subjectRouter);
app.use('/api/users', userRouter);


// Root route
app.get("/", (req: Request, res: Response) => {
	res.send({ message: "Hello, Welcome to the Classroom API!" });
});



app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});

