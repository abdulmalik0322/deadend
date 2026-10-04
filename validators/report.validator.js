import { body, param } from 'express-validator';

const TARGET_TYPES = ['experience', 'comment', 'user'];
const REASONS = [
  'spam',
  'harassment',
  'false_information',
  'privacy_violation',
  'dangerous_content',
  'other',
];

export const createReportValidator = [
  body('targetType')
    .isIn(TARGET_TYPES)
    .withMessage(`targetType must be one of: ${TARGET_TYPES.join(', ')}`),
  body('targetId').isMongoId().withMessage('targetId must be a valid id'),
  body('reason')
    .isIn(REASONS)
    .withMessage(`reason must be one of: ${REASONS.join(', ')}`),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('details must be at most 1000 characters'),
];

export const reportIdParam = [
  param('id').isMongoId().withMessage('Invalid report id'),
];

export const resolveReportValidator = [
  body('action')
    .isIn(['resolved', 'dismissed'])
    .withMessage('action must be resolved or dismissed'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('note must be at most 1000 characters'),
];
