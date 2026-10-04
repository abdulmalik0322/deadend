import { body, param } from 'express-validator';

/** :id route params must be MongoIds. */
export const commentIdParam = [
  param('id').isMongoId().withMessage('Invalid comment id'),
];

/** POST /api/comments/:id/reply */
export const replyValidator = [
  body('body')
    .trim()
    .notEmpty()
    .withMessage('Reply body is required')
    .isLength({ max: 2000 })
    .withMessage('Reply must be at most 2000 characters'),
];

/** POST /api/experiences/:id/comments — { body (1-2000), parentId? } */
export const experienceCommentValidator = [
  body('body')
    .trim()
    .notEmpty()
    .withMessage('Comment body is required')
    .isLength({ max: 2000 })
    .withMessage('Comment must be at most 2000 characters'),
  body('parentId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('parentId must be a valid id'),
];
