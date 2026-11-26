import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";

import foodRoutes from "./routes/foodRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import visionRoutes from "./routes/visionRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://172.20.10.2:5173",
    ],

    credentials: true,
  })
);

app.use(
  express.json({
    limit: "8mb",
  })
);

app.use(
  session({
    name: "shelflife.sid",

    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use("/api/foods", foodRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/history", historyRoutes);

app.use(
  "/api/vision",
  visionRoutes
);

export default app;