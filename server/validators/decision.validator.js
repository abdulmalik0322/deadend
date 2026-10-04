import { body, param } from 'express-validator';

const STATUSES = ['planning', 'active', 'completed', 'abandoned'];
const VISIBILITY = ['public', 'private'];

export const decisionIdParam = [
  param('id').isMongoId().withMessage('Invalid decision id'),
];

export const milestoneIdParam = [
  param('mid').isMongoId().withMessage('Invalid milestone id'),
];

export const createDecisionValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 160 })
    .withMessage('Title must be at most 160 characters'),
  body('question')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Question must be at most 500 characters'),
  body('visibility')
    .optional()
    .isIn(VISIBILITY)
    .withMessage(`visibility must be one of: ${VISIBILITY.join(', ')}`),
  body('situation')
    .optional()
    .isObject()
    .withMessage('situation must be an object'),
  body('expectations')
    .optional()
    .isObject()
    .withMessage('expectations must be an object'),
];

export const updateDecisionValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 160 })
    .withMessage('Title must be at most 160 characters'),
  body('question')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Question must be at most 500 characters'),
  body('status')
    .optional()
    .isIn(STATUSES)
    .withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('progress must be an integer between 0 and 100'),
  body('visibility')
    .optional()
    .isIn(VISIBILITY)
    .withMessage(`visibility must be one of: ${VISIBILITY.join(', ')}`),
  body('situation')
    .optional()
    .isObject()
    .withMessage('situation must be an object'),
  body('expectations')
    .optional()
    .isObject()
    .withMessage('expectations must be an object'),
  body('actual').optional().isObject().withMessage('actual must be an object'),
  body('timeline').optional().isArray().withMessage('timeline must be an array'),
];

export const decisionUpdateValidator = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Update text is required')
    .isLength({ max: 2000 })
    .withMessage('Update must be at most 2000 characters'),
  body('stage')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Stage must be at most 120 characters'),
];

export const milestoneValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Milestone title is required')
    .isLength({ max: 120 })
    .withMessage('Milestone title must be at most 120 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('dueDate must be a valid date'),
];

export const toggleMilestoneValidator = [
  body('done')
    .optional()
    .isBoolean()
    .withMessage('done must be a boolean')
    .toBoolean(),
];

export const completeDecisionValidator = [
  body('actualInvestment')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('actualInvestment must be at most 200 characters'),
  body('actualDuration')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('actualDuration must be at most 200 characters'),
  body('actualResult')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('actualResult must be at most 1000 characters'),
  body('outcome')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('outcome must be at most 1000 characters'),
  body('duration')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('duration must be at most 200 characters'),
  body('investment')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('investment must be at most 200 characters'),
  body('result')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('result must be at most 1000 characters'),
];
