import "dotenv/config";
import app from './app'


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});


// app.ts
//    ↓
// "Here's the configured Express application."

// server.ts
//    ↓
// "Start that application on port 3000."