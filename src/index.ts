import express, { Request, Response } from "express";

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

// Root route
app.get("/", (req: Request, res: Response) => {
	res.send({ message: "Hello from Express + TypeScript!" });
});



app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}/`);
});

