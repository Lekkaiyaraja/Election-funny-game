import http from "http";
import express from "express";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://rajlekkaiyaraja_db_user:I7JzgKvAnulGpBiA@ac-csn4eiw-shard-00-00.pxbrw1r.mongodb.net:27017,ac-csn4eiw-shard-00-01.pxbrw1r.mongodb.net:27017,ac-csn4eiw-shard-00-02.pxbrw1r.mongodb.net:27017/election_game?ssl=true&replicaSet=atlas-534oll-shard-0&authSource=admin&retryWrites=true&w=majority";
const DB_NAME = "election_game";
const COLLECTION_NAME = "votes";

// Default vote data
const defaultVotes = {
  trichyEast: { tvk: 120, dmk: 95, ntk: 15, aiadmk: 3 },
  perambur: { tvk: 80, dmk: 110, ntk: 9, aiadmk: 1 }
};

// Initialize Express app and Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

// State management
let voteState = { ...defaultVotes };
let dbCollection = null;
let mongoClient = null;
let serverInstance = null;

// ============================================
// MIDDLEWARES
// ============================================

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectDatabase() {
  try {
    console.log("[DB] Connecting to MongoDB...");
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log("[DB] Connected to MongoDB successfully");

    const db = mongoClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const existing = await collection.findOne({ _id: "voteState" });

    if (!existing) {
      console.log("[DB] Initializing vote state in database");
      await collection.insertOne({ _id: "voteState", ...defaultVotes });
      voteState = { ...defaultVotes };
    } else {
      console.log("[DB] Loading existing vote state from database");
      voteState = {
        trichyEast: { ...defaultVotes.trichyEast, ...existing.trichyEast },
        perambur: { ...defaultVotes.perambur, ...existing.perambur }
      };
    }

    return collection;
  } catch (error) {
    console.error("[DB] Failed to connect to MongoDB:", error.message);
    throw error;
  }
}

// ============================================
// API ROUTES
// ============================================

app.get("/votes", (req, res) => {
  res.json(voteState);
});

app.post("/vote", async (req, res) => {
  const { constituency, party } = req.body;

  if (!voteState[constituency] || !Object.prototype.hasOwnProperty.call(voteState[constituency], party)) {
    return res.status(400).json({ error: "Invalid constituency or party." });
  }

  try {
    await dbCollection.updateOne(
      { _id: "voteState" },
      { $inc: { [`${constituency}.${party}`]: 1 } },
      { upsert: true }
    );

    voteState[constituency][party] += 1;
    io.emit("votes.updated", voteState);
    res.json(voteState);
  } catch (error) {
    console.error("[API] Error updating vote:", error.message);
    res.status(500).json({ error: "Could not update vote." });
  }
});

app.post("/admin/update", async (req, res) => {
  const { constituency, party, count } = req.body;

  if (!voteState[constituency] || !Object.prototype.hasOwnProperty.call(voteState[constituency], party)) {
    return res.status(400).json({ error: "Invalid constituency or party." });
  }

  const value = Number(count);
  if (!Number.isInteger(value) || value < 0) {
    return res.status(400).json({ error: "Count must be a non-negative integer." });
  }

  try {
    await dbCollection.updateOne(
      { _id: "voteState" },
      { $set: { [`${constituency}.${party}`]: value } },
      { upsert: true }
    );

    voteState[constituency][party] = value;
    io.emit("votes.updated", voteState);
    res.json(voteState);
  } catch (error) {
    console.error("[API] Error updating admin vote:", error.message);
    res.status(500).json({ error: "Could not update vote count." });
  }
});

// ============================================
// SOCKET.IO EVENTS
// ============================================

io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.emit("votes.updated", voteState);

  socket.on("disconnect", () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Connect to database first
    dbCollection = await connectDatabase();

    // Prevent multiple listeners (important for node --watch)
    if (serverInstance && serverInstance.listening) {
      console.log("[Server] Server already running, skipping startup");
      return;
    }

    // Start HTTP server
    serverInstance = server.listen(PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log("[Server] ✓ Server started successfully");
      console.log(`[Server] Port: ${PORT}`);
      console.log(`[Server] URL: http://localhost:${PORT}`);
      console.log(`[Server] MongoDB: Connected`);
      console.log("=".repeat(60) + "\n");
    });

    // Handle server errors
    serverInstance.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`[Server] ✗ Port ${PORT} is already in use`);
        console.error("[Server] Try: PORT=6000 npm run dev");
      } else {
        console.error("[Server] ✗ Server error:", error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("[Server] ✗ Failed to start server:", error.message);
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);

  // Close server
  if (serverInstance && serverInstance.listening) {
    serverInstance.close(() => {
      console.log("[Shutdown] ✓ HTTP server closed");
    });
  }

  // Close Socket.io connections
  io.close();
  console.log("[Shutdown] ✓ Socket.io connections closed");

  // Close MongoDB connection
  if (mongoClient) {
    try {
      await mongoClient.close();
      console.log("[Shutdown] ✓ MongoDB connection closed");
    } catch (error) {
      console.error("[Shutdown] Error closing MongoDB:", error.message);
    }
  }

  console.log("[Shutdown] ✓ Server shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("[Error] Uncaught exception:", error);
  process.exit(1);
});

// ============================================
// START SERVER
// ============================================

startServer();
