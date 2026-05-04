# Backend - Funny Live Vote Game

Node.js backend for the live vote game.

## Files

- `server.js` — Express API and Socket.io live update server
- `package.json` — backend dependencies and start script
- `.env.example` — example MongoDB connection string

## Install

```bash
cd backend
npm install
```

## Run locally

Create a `.env` file in `backend/` with your MongoDB URI:

```env
MONGODB_URI=mongodb+srv://rajlekkaiyaraja_db_user:XRaCKTJM8MdCnCec@tn-election-cluster.pxbrw1r.mongodb.net/tn_exitpoll_election?retryWrites=true&w=majority
```

Then start the server:

```bash
npm start
```

The backend listens on `http://localhost:3000` and serves:

- `GET /votes`
- `POST /vote`

It also broadcasts `votes.updated` events via Socket.io.
