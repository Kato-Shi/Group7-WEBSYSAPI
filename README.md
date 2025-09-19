# Notes API playground (V2)

This repo bundles a SQLite-backed Express API for managing notes together with a very small Tailwind-powered front end so you can exercise each endpoint without reaching for an API client. The root `notes-api` folder contains the backend, while `notes-api/src/public` hosts the hand-made browser UI.

## Project layout

```
notes-api/
├── src/
│   ├── app.js           # Express app wiring, middleware, routes, static assets
│   ├── server.js        # Boots the HTTP server after syncing Sequelize
│   ├── routes/notes.js  # REST routes for notes, categories, search, and actions
│   ├── controllers/     # Logic for CRUD, filters, and toggles
│   ├── middleware/      # Validation helpers for notes and UUID params
│   ├── models/          # Sequelize `Note` model definition
│   └── public/          # Front-end HTML, JS, and CSS playground
├── scripts/seed.js      # Optional database seeding helper
└── package.json         # API scripts (start/dev/test) and dependencies
```

## Getting started

1. Install dependencies inside the API folder:
   ```bash
   cd notes-api
   npm install
   ```
2. (Optional) install `nodemon` globally if you want auto-reload while editing the server, matching the development script: `npm install -g nodemon`.
3. Start the backend. `npm run dev` runs the dev server with nodemon, while `npm start` boots a plain Node process.
4. Visit [http://localhost:3000/app](http://localhost:3000/app) to use the browser playground. The REST endpoints live under `/api/notes`, and live API docs sit at `/api-docs`.

The API reads `NODE_ENV`, `PORT`, and database values from `.env` if provided, thanks to the `dotenv` call at the top of the Express app bootstrap.

## Backend features

- **Express bootstrap** – `src/app.js` layers in `helmet`, `cors`, `morgan`, JSON/body parsing, serves the static playground, exposes `/health`, and wires the Swagger UI alongside the notes router.
- **Server startup** – `src/server.js` authenticates and syncs Sequelize before listening on `PORT`, logging useful startup info so you know the database connection worked.
- **Note model** – `src/models/Note.js` defines the schema with UUID IDs, required `title`/`content`, optional `category`, JSON `tags`, booleans for `isPinned`/`isArchived`, and a priority enum plus indexes for frequent filters.
- **Validation middleware** – `src/middleware/validation.js` enforces that titles and content exist, validates priority, tags, and category input, and checks UUID params before controller logic runs.
- **Routing** – `src/routes/notes.js` maps CRUD endpoints, category listings, search, and archive/pin toggles to controller functions while applying validation middleware where needed.
- **Controller logic** – `src/controllers/notesController.js` implements:
  - `getAllNotes` with pagination, search, filtering, and pin-first ordering.
  - `getNoteById`, `createNote`, `updateNote`, and `deleteNote` for core CRUD flows.
  - `getNotesByCategory`, `togglePinNote`, and `toggleArchiveNote` for category views and state toggles.
  - `getCategories` and `searchNotes` to surface available categories and free-text lookup.

## Front-end playground

The `public` folder holds the intentionally simple UI that feels like a college lab project but still lets you explore every API feature.

- **Layout** – `public/index.html` renders a status badge, note editor form (title, category, content, priority, pin/archive controls), a message box, and a filtered list of saved notes in a single column layout.
- **Styling** – `public/styles.css` only tweaks the base font, textarea height, and message animation so most of the look comes from Tailwind utility classes embedded in the markup.
- **Client logic** – `public/app.js` bootstraps the UI, pings the health endpoint, loads notes, handles create/update/delete, toggles pin/archive, filters the list, and manages the amateurish notification/status badges.
  - Initialization wires events, kicks off health checks, and fetches initial notes.
  - Form submission builds payloads, decides between POST/PUT, and reloads the list afterward.
  - `renderNotes` and helpers filter, summarize, and render note cards with action buttons for edit/pin/archive/delete.
  - Utility helpers manage notifications, API status styling, generic `fetchJson`, and friendly formatting for timestamps/uptime.

Because the front end ships from the same Express process, no extra build step is required—just refresh the browser after editing the HTML/JS/CSS.

## Database utilities

The Sequelize instance is configured in `src/config/database.js`, and `scripts/seed.js` can populate sample data. Run `npm run seed` if you want demo rows before opening the UI.

## Testing

Run `npm test` inside `notes-api` to execute the Jest test suite that targets the API controllers and routes. The configuration lives in the API `package.json` under the `jest` key.
