# Omnicore Order Service

Microservice for order taking and fulfillment lifecycle management. Validates product availability and stock, computes totals, and automatically syncs stock with the product service on order creation and cancellation.

## Prerequisites

- Node.js 22+
- PostgreSQL 13+
- npm
- A running instance of `omnicore-product` (for stock sync)

## Quick Start

```bash
cd omnicore-order
cp .env.example .env   # fill in your values
npm run dev
```

> **Note:** `npm install` must be run from the **monorepo root**, not inside this directory, to keep the single `package-lock.json` in sync.

Open http://localhost:3004/api-docs to browse the API.

## API Documentation

Interactive Swagger UI is available at `/api-docs` when the server is running.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/orders` | Place a new order (order taking) |
| `GET` | `/api/orders` | List orders (filterable by `userId`, `status`, `countryId`) |
| `GET` | `/api/orders/:id` | Get a single order by ID |
| `PATCH` | `/api/orders/:id/status` | Advance order through its lifecycle |
| `DELETE` | `/api/orders/:id` | Delete an order |
| `GET` | `/health` | Health check |

### Order Lifecycle

Status transitions are strictly enforced:

```
pending → confirmed → shipped → delivered
    ↘          ↘
   cancelled  cancelled
```

| From | Allowed next statuses |
|------|-----------------------|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `shipped`, `cancelled` |
| `shipped` | `delivered` |
| `delivered` | — (terminal) |
| `cancelled` | — (terminal) |

Lifecycle timestamps (`confirmedAt`, `shippedAt`, `deliveredAt`, `cancelledAt`) are set automatically on each transition.

When transitioning to `shipped`, you may provide `trackingNumber`, `shippingProvider`, and `estimatedDelivery`.

When transitioning to `cancelled`, stock is automatically restored in the product service.

### Stock Synchronisation

- **On order creation**: stock is decremented in `omnicore-product` for each item via `PATCH /api/country-products/:id/stock`.
- **On cancellation**: stock is restored via the same endpoint.
- Stock sync failures are logged as warnings and do **not** roll back the order operation.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start dev server with hot reload (nodemon) |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Auto-fix lint issues |

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — |
| `PORT` | Server port | No | `3004` |
| `NODE_ENV` | `development` or `production` | No | `development` |
| `PRODUCT_SERVICE_URL` | Base URL of the product service | No | `http://localhost:3001` |

## Project Structure

```
src/
  config/        # Database, logger, Swagger, app config
  controllers/   # Request/response handlers
  services/      # Business logic & stock sync
  repositories/  # Prisma database queries
  routes/        # Express routes & validation
  middlewares/   # Pino HTTP logging, correlation ID
  app.js         # Express app setup
  server.js      # Server bootstrap
prisma/
  schema.prisma  # Stub — schema is owned by @omnicore/db
  migrations/    # Migration history
```

> **Schema ownership**: The canonical Prisma schema lives in `omnicore-db/prisma/schema.prisma`. The `prisma/` directory inside this service is a stub. To add or modify models, edit the shared schema and run migrations from `omnicore-db`.

## Running with Docker

The service is started as part of the monorepo via `docker compose up` from the root. It waits for `omnicore-db` (migration runner) to complete successfully before starting.

```bash
# From the monorepo root
docker compose up --build   # first run
docker compose up           # subsequent runs
```

The container exposes port **3004** and includes a health check against `GET /health`.

## License

ISC
