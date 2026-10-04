import { body } from 'express-validator';

/** POST /api/admin/moderation/:id — { action: 'approve'|'reject', note? } */
export const moderateExperienceValidator = [
  body('action')
    .exists({ checkFalsy: true })
    .withMessage('action is required')
    .isIn(['approve', 'reject'])
    .withMessage("action must be 'approve' or 'reject'"),
  body('note')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('note must be a string')
    .trim()
    .isLength({ max: 500 })
    .withMessage('note must be at most 500 characters'),
];

/** POST /api/admin/reports/:id/resolve — { action: 'resolved'|'dismissed', note? } */
export const resolveAdminReportValidator = [
  body('action')
    .exists({ checkFalsy: true })
    .withMessage('action is required')
    .isIn(['resolved', 'dismissed'])
    .withMessage("action must be 'resolved' or 'dismissed'"),
  body('note')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('note must be a string')
    .trim()
    .isLength({ max: 500 })
    .withMessage('note must be at most 500 characters'),
];

/** POST /api/admin/users/:id/suspend — { suspended: boolean } */
export const suspendUserValidator = [
  body('suspended')
    .exists()
    .withMessage('suspended is required')
    .isBoolean()
    .withMessage('suspended must be a boolean')
    .toBoolean(),
];
