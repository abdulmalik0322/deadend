import { body, param, query } from 'express-validator';

export const folderNameValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Folder name is required')
    .isLength({ max: 60 })
    .withMessage('Folder name must be at most 60 characters'),
];

export const folderIdParam = [
  param('id').isMongoId().withMessage('Invalid folder id'),
];

export const listSavedQueryValidator = [
  query('folderId')
    .optional()
    .isMongoId()
    .withMessage('folderId must be a valid id'),
  query('folder')
    .optional()
    .isMongoId()
    .withMessage('folder must be a valid id'),
  query('q')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('q must be at most 200 characters'),
];
