import "dotenv/config";
import app from "./app";
import { validateConfig } from "./config";

try {
  const { port } = validateConfig(process.env);

  app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
  });
} catch (error) {
  console.error("Fatal startup configuration error:", (error as Error).message);
  process.exit(1);
}


// app.ts
//    ↓
// "Here's the configured Express application."

// server.ts
//    ↓
// "Start that application on port 3000."