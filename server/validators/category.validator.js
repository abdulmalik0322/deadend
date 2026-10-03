import { body } from 'express-validator';

export const createCategoryValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 80 })
    .withMessage('Name must be at most 80 characters'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug may only contain lowercase letters, numbers and hyphens'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('icon').optional().trim().isLength({ max: 20 }),
];

export const updateCategoryValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('icon').optional().trim().isLength({ max: 20 }),
  body('popularSearches').optional().isArray(),
  body('trending').optional().isArray(),
];
