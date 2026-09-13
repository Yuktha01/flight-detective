import express from "express";
import cors from "cors";
import flightRoutes from "./routes/flightRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/flights", flightRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Flight Detective backend is running",
  });
});

export default app;