import express, { Request, Response } from "express";
import cors from "cors";
import subjectRouter from "./routes/subjects";
import securityMiddleware from "./middleware/security";

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


app.use(securityMiddleware);


app.use('/api/subjects', subjectRouter);


// Root route
app.get("/", (req: Request, res: Response) => {
	res.send({ message: "Hello, Welcome to the Classroom API!" });
});



app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});

// 5:34:3