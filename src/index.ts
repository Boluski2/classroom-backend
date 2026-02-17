import express, { Request, Response } from "express";
import cors from "cors";
import subjectRouter from "./routes/subjects";

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

app.use('/api/subjects', subjectRouter);

app.use(cors ({
 origin: process.env.FRONTEND_URL,
 methods: ['GET', 'POST', 'PUT', 'DELETE'],
//  allowedHeaders: ['Content-Type', 'Authorization'],
 credentials: true,
}))



// Root route
app.get("/", (req: Request, res: Response) => {
	res.send({ message: "Hello from Express + TypeScript!" });
});



app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});

