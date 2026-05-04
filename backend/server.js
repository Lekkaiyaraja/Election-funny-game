import http from "http";
import express from "express";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://rajlekkaiyaraja_db_user:I7JzgKvAnulGpBiA@ac-csn4eiw-shard-00-00.pxbrw1r.mongodb.net:27017,ac-csn4eiw-shard-00-01.pxbrw1r.mongodb.net:27017,ac-csn4eiw-shard-00-02.pxbrw1r.mongodb.net:27017/election_game?ssl=true&replicaSet=atlas-534oll-shard-0&authSource=admin&retryWrites=true&w=majority";
const PORT = process.env.PORT || 3002;
const DB_NAME = "election_game";
const COLLECTION_NAME = "votes";

const defaultVotes = {
  trichyEast: { tvk: 120, dmk: 95, ntk: 15, aiadmk: 3 },
  perambur: { tvk: 80, dmk: 110, ntk: 9, aiadmk: 1 }
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

let voteState = { ...defaultVotes };
let dbCollection = null;

async function connectDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);
  const existing = await collection.findOne({ _id: "voteState" });

  if (!existing) {
    await collection.insertOne({ _id: "voteState", ...defaultVotes });
    voteState = { ...defaultVotes };
  } else {
    voteState = {
      trichyEast: { ...defaultVotes.trichyEast, ...existing.trichyEast },
      perambur: { ...defaultVotes.perambur, ...existing.perambur }
    };
  }

  return collection;
}

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
    console.error("Error updating vote:", error);
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
    console.error("Error updating admin vote:", error);
    res.status(500).json({ error: "Could not update vote count." });
  }
});

io.on("connection", socket => {
  socket.emit("votes.updated", voteState);
});

async function startServer() {
  try {
    dbCollection = await connectDatabase();
    console.log("Connected to MongoDB and vote state initialized.");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
