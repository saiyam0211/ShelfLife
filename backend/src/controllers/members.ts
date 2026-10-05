import type { RequestHandler } from 'express';
import { ApiError } from '../middleware/errorHandler.ts';
import { BorrowRecord } from '../models/BorrowRecord.ts';
import { Member } from '../models/Member.ts';

interface CreateMemberInput {
  name: string;
  email: string;
  membershipId: string;
}

// POST /api/members
export const createMember: RequestHandler = async (_req, res) => {
  const { name, email, membershipId } = res.locals.body as CreateMemberInput;
  const member = await Member.create({ name, email, membershipId });
  res.status(201).json({ data: member });
};

// GET /api/members
export const listMembers: RequestHandler = async (_req, res) => {
  // ponytail: unpaginated list for the selection control of one college library.
  // Use server-side member search and pagination for the university network.
  const members = await Member.find().sort({ name: 1, _id: 1 });
  res.json({ data: members });
};

// GET /api/members/:id/history
export const getMemberHistory: RequestHandler = async (_req, res) => {
  const { id } = res.locals.params as { id: string };
  if (!(await Member.exists({ _id: id }))) {
    throw new ApiError(404, 'NOT_FOUND', 'Member not found');
  }

  // Complete history, newest first. Summaries go in bookDetails and memberDetails.
  const records = await BorrowRecord.find({ member: id })
    .sort({ issueDate: -1, _id: -1 })
    .populate('bookDetails', 'title author ISBN')
    .populate('memberDetails', 'name membershipId');
  res.json({ data: records });
};
