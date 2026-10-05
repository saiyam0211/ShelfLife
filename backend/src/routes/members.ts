import { Router } from 'express';
import { createMember, getMemberHistory, listMembers } from '../controllers/members.ts';
import { requireLibrarian } from '../middleware/auth.ts';
import { email, objectId, text, validate } from '../middleware/validate.ts';

export const memberRoutes = Router();

// Every member route needs a librarian token: responses contain member information.
memberRoutes.use(requireLibrarian);

memberRoutes.post(
  '/',
  validate('body', { name: text(1, 200), email, membershipId: text(1, 80) }),
  createMember,
);
memberRoutes.get('/', listMembers);
memberRoutes.get('/:id/history', validate('params', { id: objectId }), getMemberHistory);
