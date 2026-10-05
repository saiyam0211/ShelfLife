import { Schema, model } from 'mongoose';

// Remove spaces and hyphens. ISBN-10 can end with the check character X.
export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

// Accept a normalized ISBN-10 or ISBN-13 with a valid check digit.
export function isValidIsbn(isbn: string): boolean {
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (total, char, index) => total + (10 - index) * (char === 'X' ? 10 : Number(char)),
      0,
    );
    return sum % 11 === 0;
  }
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3),
      0,
    );
    return sum % 10 === 0;
  }
  return false;
}

// Assumption: store each genre in one spelling, for example "science  fiction"
// becomes "Science Fiction". Insertion, the genre filter, and the genre list
// use this function, so letter case never creates two genres.
export function normalizeGenre(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (match) => match.toUpperCase());
}

// Sort titles without letter case. The listing indexes use the same collation.
export const TITLE_COLLATION = { locale: 'en', strength: 2 } as const;

const integerRule = { validator: Number.isInteger, message: '{PATH} must be an integer' };

const bookSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    author: { type: String, required: true, trim: true, maxlength: 200 },
    ISBN: {
      type: String,
      required: true,
      unique: true,
      set: normalizeIsbn,
      validate: { validator: isValidIsbn, message: 'ISBN must have a valid check digit' },
    },
    genre: { type: String, required: true, set: normalizeGenre, maxlength: 80 },
    totalCopies: { type: Number, required: true, min: 1, validate: integerRule },
    // A new book has all copies available. Only issue and return change this count.
    availableCopies: {
      type: Number,
      required: true,
      min: 0,
      default: function (this: { totalCopies: number }) {
        return this.totalCopies;
      },
      validate: [
        integerRule,
        {
          validator: function (this: { totalCopies: number }, value: number) {
            return value <= this.totalCopies;
          },
          message: 'availableCopies must not exceed totalCopies',
        },
      ],
    },
  },
  { versionKey: false },
);

bookSchema.index({ title: 1, _id: 1 }, { collation: TITLE_COLLATION });
bookSchema.index({ genre: 1, title: 1, _id: 1 }, { collation: TITLE_COLLATION });

export const Book = model('Book', bookSchema);
