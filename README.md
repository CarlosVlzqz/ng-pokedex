# 🎮 Ng-Pokédex

A modern, high-performance Pokédex web app built with **Angular 21**. Browse the first four generations (493 Pokémon), search by name or Pokédex number, filter by one or more types, and dive into detailed stats, type matchups, and evolution chains — all with a sleek glassmorphism UI and a Dark Mode toggle.

---

## ✨ Features

- **Gen 1–4 Pokédex** — Browse all 493 Pokémon with infinite scroll (50 at a time)
- **Instant Search** — Filter by name or Pokédex number, no delay
- **Multi-Type Filter** — Dropdown checkbox filter supporting 1 or more types simultaneously (union logic)
- **Dismissable Type Tags** — Remove active type filters without reopening the dropdown
- **Dark / Light Mode** — Persistent theme toggle via `localStorage`
- **Glassmorphism UI** — Translucent panels, backdrop blur, and dynamic color backgrounds
- **Detail View with Tabs**:
  - **About** — Category, types, height, weight, Pokédex entry
  - **Base Stats** — Animated stat bars
  - **Matchups** — Type weaknesses, resistances, and immunities (loaded on demand)
  - **Evolutions** — Full evolution chain with clickable thumbnails
- **Shiny Sprite Toggle** — Switch between regular and shiny official artwork
- **Cry Playback** — Listen to the Pokémon's cry
- **Pokédex Navigation** — Previous / Next arrows and a Home button on the detail view
- **On-Demand API Consumption** — Tab data is only fetched when first requested
- **Centralized Caching** — All API responses are cached in-session to avoid redundant calls

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Angular 21](https://angular.dev) (standalone components, Signals) |
| Styling | Vanilla CSS with CSS variables |
| API | [PokéAPI](https://pokeapi.co) |
| Color Extraction | [colorthief](https://lokeshdhakar.com/projects/color-thief/) |
| Routing | Angular Router |
| State | Angular Signals (`signal`, `computed`) |
| HTTP | Angular `HttpClient` |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- npm v9+

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ng-pokedex.git
cd ng-pokedex

# Install dependencies
npm install

# Start the dev server
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── pokemon-list/     # Main Pokédex list with search + type filter
│   │   └── pokemon-detail/   # Detail view with tabs
│   └── services/
│       ├── pokemon.ts         # PokéAPI service with in-memory cache
│       └── theme_service.ts   # Dark/light mode persistence
└── styles.css                 # Global CSS variables and theme definitions
```

---

## 📄 License

MIT


## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
