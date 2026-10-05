# ShelfLife — IA2 project documentation

## Assumptions

This repository contains the exam specification, the build documentation, and the backend application.
The backend in `backend/` is complete and verified. See "Verified backend status" below.
The frontend in `frontend/` does not exist yet. Frontend sections describe the intended implementation.

The assessment lasts **3 hours** and carries **50 marks**.
Q1 carries 20 marks. Q2 carries 20 marks. Q3 carries 10 marks.
Complete all three questions for the same library system.

## Start here

1. Read [the original exam specification](IA2_FullStack_Exam.md).
2. Read [the AI agent instructions](AGENTS.md).
3. Read [the implementation guide](docs/IMPLEMENTATION.md).
4. Read [the system design answer](docs/SYSTEM_DESIGN.md).
5. Implement each build stage in the implementation guide.
6. Check every row in the requirement coverage table.

The original exam specification is the source of truth.
The implementation guide defines assumptions where the exam does not specify behavior.
Keep backend code, frontend code, and the system design answer in separate locations.

## Planned setup

These commands are the required setup contract for the completed application.
The backend and database commands are verified. The frontend commands do not work until `frontend/` exists.

Install Node.js 22.18 or later, npm, and Docker with Compose support.
Use a MongoDB replica set for transactions.

| Runtime | Verified version |
|---|---|
| Node.js | 24.2.0 |
| npm | 11.3.0 |
| MongoDB Atlas | 8.0.34, three-member replica set |
| MongoDB, local alternative | 8.3.11, Docker image `mongo:8` |
| Docker Compose | 2.40.3 |

Node.js runs the TypeScript source directly. No separate TypeScript runner is installed.
Node.js 24.2 prints an `ExperimentalWarning` for this feature. The warning is harmless.

```sh
docker compose up -d mongo
docker compose run --rm mongo-init
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend run seed
```

Set `JWT_SECRET` and `SEED_LIBRARIAN_PASSWORD` in `backend/.env` before you run the seed command.
Use 32 characters or more for `JWT_SECRET`. The command `openssl rand -hex 32` supplies a suitable value.
A repeated seed applies the current `SEED_LIBRARIAN_PASSWORD` to the seed librarian.

### Database selection

The development setup uses MongoDB Atlas. An Atlas cluster is a replica set, so transactions work.
Copy `MONGODB_URI` from `atlas-credentials.env` into `backend/.env`.
Add `/shelflife?retryWrites=true&w=majority` to the end of that URI.
Skip both `docker compose` commands when you use Atlas.
Keep `atlas-credentials.env` and `backend/.env` out of source control. The `.gitignore` file excludes both.

The Docker Compose replica set is the local alternative.
Use `MONGODB_URI=mongodb://localhost:27017/shelflife?replicaSet=rs0` for that alternative.
Use separate terminals for these commands:

```sh
npm --prefix backend run dev
```

```sh
npm --prefix frontend run dev
```

Open `http://localhost:5173`.
The backend listens on `http://localhost:3000`.
The local MongoDB alternative listens on `localhost:27017`.

Use these checks after implementation:

```sh
npm --prefix backend test
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

The seed command creates 13 books, 3 members, 3 borrow records, and one librarian.
The seed command is safe to repeat. It adds only missing records.
It never overwrites existing loans and never resets copy counts.

## Verified backend status

These results are from 2026-10-05 with the runtime versions above.

| Check | Result |
|---|---|
| `docker compose up -d mongo`, then `mongo-init` two times | Pass; the second run reports an existing replica set |
| `npm --prefix backend ci`, then `npm --prefix backend run build` | Pass; no TypeScript errors |
| `npm --prefix backend run seed` two times | Pass on Atlas and on Docker; counts are equal after both runs |
| `npm --prefix backend test` | Pass on Atlas, 5 of 5 tests, 3 consecutive runs; pass on Docker, 8 consecutive runs |
| All sample requests in the implementation guide, section 7 | Pass against the compiled server with Docker |
| `npm --prefix backend run dev` | Pass on Atlas; login, book list, genre list, and member history answer |

The test command uses the database `shelflife_test` on the configured MongoDB deployment.
It refuses the application database name and deletes all data in the test database.
Frontend checks, the final acceptance table UI rows, and a fresh-clone setup are not done.

## API list

All paths use the backend origin. Send JSON bodies with `Content-Type: application/json`.
Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose | Librarian token |
|---|---|---|---|
| POST | `/api/auth/login` | Issue a JWT | No |
| POST | `/api/books` | Add a book | Yes |
| GET | `/api/books` | List, paginate, and filter books | No |
| POST | `/api/members` | Register a member | Yes |
| POST | `/api/borrow` | Issue a book | Yes |
| POST | `/api/return/:borrowId` | Return a book | Yes |
| GET | `/api/members/:id/history` | Read complete member history | Yes |
| GET | `/api/members` | Supply member selection options | Yes |
| GET | `/api/books/genres` | Supply all genre options | No |

The last two endpoints support frontend selection controls.
They supplement the exam endpoints.
The implementation guide defines request bodies, responses, errors, and sample requests for every endpoint.

## Submission files

| Deliverable | Required location |
|---|---|
| Express application | `backend/` |
| Routes, controllers, models, middleware | Separate folders inside `backend/src/` |
| Setup instructions and API list | This README |
| Sample requests | `docs/IMPLEMENTATION.md`, section 7 |
| React and TypeScript application | `frontend/` |
| Components and pages | Separate folders inside `frontend/src/` |
| State management note | `docs/IMPLEMENTATION.md`, section 6 |
| Race condition note, 4–6 lines | `docs/IMPLEMENTATION.md`, section 5 |
| System design answer, 1–2 pages | `docs/SYSTEM_DESIGN.md` |
| Labeled diagrams | Mermaid blocks in both documentation files |

Use consistent indentation and descriptive names.
Add comments for transaction behavior and other non-obvious decisions.
Put assumptions at the top of each answer or deliverable.

## Writing technique

This documentation uses ASD-STE100 writing techniques for clear technical instructions.
It uses short sentences, direct commands, consistent terms, and one action per instruction.
Software identifiers remain unchanged.
This is an STE-oriented document, without a full controlled-dictionary compliance audit.
See the [official ASD-STE100 guidance](https://www.asd-ste100.org/STE_faq.html) and [Issue 9 writing rules](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf).
