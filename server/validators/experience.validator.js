import { body } from 'express-validator';

const OUTCOMES = ['successful', 'partially_successful', 'unsuccessful', 'abandoned'];
const PRIVACY = ['public', 'anonymous', 'private'];

export const createExperienceValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 160 })
    .withMessage('Title must be at most 160 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Category must be a valid id'),
  body('goal')
    .trim()
    .notEmpty()
    .withMessage('Goal is required')
    .isLength({ max: 300 })
    .withMessage('Goal must be at most 300 characters'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('outcome')
    .notEmpty()
    .withMessage('Outcome is required')
    .isIn(OUTCOMES)
    .withMessage(`Outcome must be one of: ${OUTCOMES.join(', ')}`),
  body('country').optional().trim().isLength({ max: 80 }),
  body('duration').optional().trim().isLength({ max: 80 }),
  body('investmentDisplay').optional().trim().isLength({ max: 120 }),
  body('mainObstacle').optional().trim().isLength({ max: 300 }),
  body('privacy').optional().isIn(PRIVACY),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isString(),
];

export const updateExperienceValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 160 }),
  body('category').optional().isMongoId().withMessage('Category must be a valid id'),
  body('goal').optional().trim().notEmpty().isLength({ max: 300 }),
  body('description').optional().trim().notEmpty(),
  body('outcome').optional().isIn(OUTCOMES),
  body('country').optional().trim().isLength({ max: 80 }),
  body('duration').optional().trim().isLength({ max: 80 }),
  body('investmentDisplay').optional().trim().isLength({ max: 120 }),
  body('mainObstacle').optional().trim().isLength({ max: 300 }),
  body('privacy').optional().isIn(PRIVACY),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isString(),
];
