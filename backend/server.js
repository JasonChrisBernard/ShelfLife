import app from "./src/app.js";
import connectDB from "./src/config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 ShelfLife server running on port ${PORT}`);
  });
};

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🚀 ShelfLife server running on port ${PORT}`
    );
  }
);

startServer();