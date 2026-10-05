# Build instructions for the AI agent

## Assumptions

The backend and the frontend are implemented and verified.
Read the README for the verified status and the remaining unverified cases.
Build a working application for one college library.
Describe the university network in the separate system design answer.

## Required reading

1. Read `IA2_FullStack_Exam.md` in full.
2. Read `README.md`.
3. Read `docs/IMPLEMENTATION.md` in full.
4. Read `docs/SYSTEM_DESIGN.md`.

Use the exam specification when documents conflict.
Update this documentation when you resolve a conflict.
Identify additions and assumptions explicitly.
Do not remove an assessed requirement to reduce code.

## Implementation rules

- Use Node.js, Express, and MongoDB with Mongoose for Q1.
- Use React, TypeScript, Vite, and React Router for Q2.
- Use `fetch`, React local state, and a small authentication Context.
- Use manual input validation unless an installed library already provides it.
- Use existing helpers before you create new helpers.
- Keep routes, controllers, models, and middleware in separate folders.
- Use one generic component for both books and members.
- Use database transactions for issue and return operations.
- Protect each mutation except login with server-side librarian authentication.
- Keep secrets outside source control and browser bundles.
- Keep Q3 scale components in the design document.
- Do not build Redis, sharding, autoscaling, or a queue for the assessment application.
- Do not add unrequested edit, delete, fine, reservation, or notification features.

## Build procedure

1. Create the folder structure from the implementation guide.
2. Complete the build stages in their specified order.
3. Run each stage's acceptance checks.
4. Add the specified integration check for copy counts and concurrent operations.
5. Check frontend behavior against the acceptance table.
6. Update the README with verified setup commands and runtime versions.
7. Confirm that every assessed requirement has an implementation or written answer.
8. Report completed checks and remaining failures accurately.

Do not claim completion when tests fail or deliverables are missing.
Do not replace the real database with a permanent mock.
Temporary frontend mock data is permitted while the backend is incomplete.
Remove the mock from the default application before final verification.

## Documentation rules

Use ASD-STE100 writing techniques.
Keep procedural sentences within 20 words where possible.
Write one action in each procedural sentence.
Use active voice and direct commands.
Define technical terms before you use them.
Use the same term for the same object.
Keep Mermaid diagrams consistent with actual routes and data.
Do not claim certified STE compliance without a full language audit.
