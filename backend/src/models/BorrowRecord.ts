import { Schema, model } from 'mongoose';

export const LOAN_DAYS = 14;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const BORROW_STATUSES = ['issued', 'returned', 'overdue'] as const;
export type BorrowStatus = (typeof BORROW_STATUSES)[number];

// The stored status changes only on issue and return, so the database can hold
// `issued` for a loan that is past its due instant. The API reports the
// effective status instead. This avoids a scheduled status-update job.
export function effectiveStatus(
  record: { dueDate: Date; returnDate?: Date | null },
  now = new Date(),
): BorrowStatus {
  if (record.returnDate) {
    return 'returned';
  }
  return record.dueDate < now ? 'overdue' : 'issued';
}

const borrowRecordSchema = new Schema(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    issueDate: { type: Date, required: true },
    dueDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: { issueDate: Date }, value: Date) {
          return value > this.issueDate;
        },
        message: 'dueDate must be later than issueDate',
      },
    },
    returnDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (this: { issueDate: Date }, value: Date | null) {
          return value === null || value >= this.issueDate;
        },
        message: 'returnDate must not precede issueDate',
      },
    },
    status: { type: String, required: true, enum: BORROW_STATUSES, default: 'issued' },
  },
  {
    versionKey: false,
    id: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.status = effectiveStatus(ret);
        return ret;
      },
    },
  },
);

// `book` and `member` stay ID strings in every response.
// History populates these virtual fields with summaries instead.
borrowRecordSchema.virtual('bookDetails', {
  ref: 'Book',
  localField: 'book',
  foreignField: '_id',
  justOne: true,
});
borrowRecordSchema.virtual('memberDetails', {
  ref: 'Member',
  localField: 'member',
  foreignField: '_id',
  justOne: true,
});

// Member history: newest loan first, with _id as a stable tie-breaker.
borrowRecordSchema.index({ member: 1, issueDate: -1, _id: -1 });

export const BorrowRecord = model('BorrowRecord', borrowRecordSchema);
