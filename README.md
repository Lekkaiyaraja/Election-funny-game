# Funny Live Vote Game

This project is now separated into two deployable apps:

- `frontend/` — static game UI for Netlify or any static host
- `backend/` — Node/Express + Socket.io API server with MongoDB persistence

## Folder structure

- `frontend/index.html`
- `frontend/style.css`
- `frontend/script.js`
- `frontend/images/` — party leader images
- `backend/server.js`
- `backend/package.json`
- `backend/.env.example`

## Deploy frontend separately

1. Push `frontend/` to a Git repository.
2. Configure Netlify or another static host to publish from `frontend/`.
3. If the backend is deployed on a separate domain, update `frontend/script.js` `BACKEND_URL` to point to that endpoint.

## Deploy backend separately

1. In `backend/`, run `npm install`.
2. Create `.env` based on `backend/.env.example`.
3. Run `npm start`.

## Local development

- Frontend: open `frontend/index.html` in a browser or serve it using a static server.
- Backend: run `npm install` and `npm start` inside `backend/`.

## MongoDB setup

Use the provided MongoDB URI in `backend/.env.example` or set `MONGODB_URI` in your environment.

## Notes

- The frontend is now decoupled from the backend and can be hosted separately.
- The backend exposes `/votes` and `/vote` and broadcasts real-time updates with Socket.io.
