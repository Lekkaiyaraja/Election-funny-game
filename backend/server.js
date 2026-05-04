import http from "http";
import express from "express";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://rajlekkaiyaraja_db_user:XRaCKTJM8MdCnCec@tn-election-cluster.pxbrw1r.mongodb.net/tn_exitpoll_election?retryWrites=true&w=majority";
const PORT = process.env.PORT || 3000;
const DB_NAME = "tn_exitpoll_election";
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
