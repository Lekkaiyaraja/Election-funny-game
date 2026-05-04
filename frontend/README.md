# Frontend - Funny Live Vote Game

Static front-end for the live vote game.

## Files

- `index.html` — user interface
- `style.css` — styles and layout
- `script.js` — Socket.io client, vote logic, animations, and party image rain
- `images/` — leader images for each party

## Local preview

Open `frontend/index.html` in a browser, or run a static server from the `frontend/` folder.

## Backend connection

The frontend talks to the backend at `http://localhost:3000` by default. If your backend is deployed elsewhere, update `BACKEND_URL` in `frontend/script.js`.
