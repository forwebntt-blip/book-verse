# Bookverse

Bookverse is a full-stack online bookstore project built with:

- `Express 5 + TypeScript` for the backend
- `React 18 + Vite` for the frontend
- `PostgreSQL + Prisma` for the data layer

The project includes:

- storefront pages for browsing books and placing orders
- authentication and account history
- admin catalog and order operations
- content staging and publish flow
- analytics dashboard support

## Requirements

- `Node.js 20+`
- `PostgreSQL 15+`
- `npm`

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Copy environment variables

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Update `DATABASE_URL` and `SESSION_SECRET` in `.env`

4. Generate Prisma client and apply migrations

```bash
npm run prisma:generate
npx prisma migrate deploy
```

For local development, you can also use:

```bash
npx prisma migrate dev
```

5. Seed sample data

```bash
npm run prisma:seed
```

6. Run the app

Backend:

```bash
npm run dev:server
```

Frontend dev server:

```bash
npm run dev:client
```

## Build and Run Production Mode

```bash
npm run build
npm start
```

## Useful Scripts

- `npm run build` - build backend and frontend
- `npm start` - run compiled backend
- `npm run test` - run unit/service tests
- `npm run test:e2e` - run Playwright smoke tests
- `npm run test:preflight` - run preflight verification
- `npm run prisma:seed` - seed development data
- `npm run prisma:studio` - open Prisma Studio

## Environment Variables

Main variables are documented in `.env.example`, including:

- `PORT`
- `APP_BASE_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `ANALYTICS_RELAY_ENABLED`
- `GA4_MEASUREMENT_ID`
- `GA4_API_SECRET`
- `BANK_TRANSFER_*`

## Project Structure

```text
book-verse/
|-- src/            backend, modules, middleware, server
|-- client/         React + Vite frontend
|-- prisma/         schema, migrations, seed
|-- public/         runtime images and static assets
|-- tests/          unit, manual acceptance, e2e
|-- scripts/        utility scripts
|-- .env.example    sample environment variables
|-- package.json    scripts and dependencies
```

## Notes

- `public/` is required at runtime because it contains bookstore images and static assets.
- Do not commit `.env`.
- For a fresh machine, the minimum flow is:
  - `npm install`
  - configure `.env`
  - `npx prisma migrate deploy`
  - `npm run prisma:seed`
  - `npm run build`
  - `npm start`

## Repository

GitHub repository:

- [https://github.com/forwebntt-blip/book-verse](https://github.com/forwebntt-blip/book-verse)
