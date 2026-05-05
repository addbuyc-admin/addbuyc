# AddBuy+C — Forum (Next.js MVP)

A minimal web forum: post list, likes, and a create-post form with optional image upload. Data is stored in the browser (`localStorage`) for this demo.

## Requirements

- [Node.js](https://nodejs.org/) 18.18 or newer (20 LTS recommended)
- npm (ships with Node)

## Setup and run

```bash
cd addbuy-forum
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build` | Production build        |
| `npm run start` | Run production server    |
| `npm run lint` | ESLint                   |

## Stack

- Next.js (App Router), React 19, TypeScript
- Tailwind CSS
- Seed posts + client-side persistence (no database)
