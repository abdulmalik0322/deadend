import { body } from 'express-validator';

const STATUSES = ['planning', 'active', 'completed', 'abandoned'];

export const createDecisionValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 160 })
    .withMessage('Title must be at most 160 characters'),
  body('question')
    .trim()
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ max: 500 })
    .withMessage('Question must be at most 500 characters'),
  body('status').optional().isIn(STATUSES),
  body('progress').optional().isInt({ min: 0, max: 100 }),
];

export const updateDecisionValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 160 }),
  body('question').optional().trim().notEmpty().isLength({ max: 500 }),
  body('status').optional().isIn(STATUSES),
  body('progress').optional().isInt({ min: 0, max: 100 }),
];

export const decisionUpdateValidator = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Update text is required')
    .isLength({ max: 2000 })
    .withMessage('Update must be at most 2000 characters'),
];

export const milestoneValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Milestone title is required')
    .isLength({ max: 200 })
    .withMessage('Milestone title must be at most 200 characters'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
];
