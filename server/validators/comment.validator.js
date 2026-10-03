import { body } from 'express-validator';

export const createCommentValidator = [
  body('experienceId')
    .notEmpty()
    .withMessage('experienceId is required')
    .isMongoId()
    .withMessage('experienceId must be a valid id'),
  body('body')
    .trim()
    .notEmpty()
    .withMessage('Comment body is required')
    .isLength({ max: 2000 })
    .withMessage('Comment must be at most 2000 characters'),
];

export const replyValidator = [
  body('body')
    .trim()
    .notEmpty()
    .withMessage('Reply body is required')
    .isLength({ max: 2000 })
    .withMessage('Reply must be at most 2000 characters'),
];
