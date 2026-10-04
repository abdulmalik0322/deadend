import { body, param } from 'express-validator';

const OUTCOMES = ['successful', 'partially_successful', 'unsuccessful', 'abandoned'];
const PRIVACY = ['public', 'anonymous', 'private'];

/** :id route params must be MongoIds. */
export const experienceIdParam = [
  param('id').isMongoId().withMessage('Invalid experience id'),
];

const titleField = (chain) =>
  chain
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 160 })
    .withMessage('Title must be at most 160 characters');

/** category is sent as a slug (e.g. "freelancing") and resolved to an ObjectId in the controller. */
const categoryField = (chain, required) => {
  let c = chain.trim();
  if (required) c = c.notEmpty().withMessage('Category is required');
  else c = c.optional();
  return c
    .isLength({ max: 80 })
    .withMessage('Category must be at most 80 characters')
    .matches(/^[a-z0-9_-]+$/i)
    .withMessage('Category must be a valid slug');
};

const goalField = (chain, required) => {
  let c = chain.trim();
  if (required) c = c.notEmpty().withMessage('Goal is required');
  else c = c.optional();
  return c.isLength({ max: 300 }).withMessage('Goal must be at most 300 characters');
};

const descriptionField = (chain, required) => {
  let c = chain.trim();
  if (required) c = c.notEmpty().withMessage('Description is required');
  else c = c.optional();
  return c.isLength({ max: 20000 }).withMessage('Description must be at most 20000 characters');
};

const outcomeField = (chain, required) => {
  let c = chain;
  if (required) c = c.notEmpty().withMessage('Outcome is required');
  else c = c.optional();
  return c.isIn(OUTCOMES).withMessage(`Outcome must be one of: ${OUTCOMES.join(', ')}`);
};

const startingPointFields = [
  body('startingPoint').optional().isObject().withMessage('startingPoint must be an object'),
  body('startingPoint.education').optional().trim().isLength({ max: 120 }),
  body('startingPoint.experienceLevel').optional().trim().isLength({ max: 80 }),
  body('startingPoint.budget').optional().trim().isLength({ max: 120 }),
  body('startingPoint.timeAvailable').optional().trim().isLength({ max: 120 }),
  body('startingPoint.location').optional().trim().isLength({ max: 120 }),
  body('startingPoint.skills').optional().isArray({ max: 30 }),
  body('startingPoint.skills.*').optional().trim().isString().isLength({ max: 60 }),
];

const timelineFields = [
  body('timeline').optional().isArray({ max: 50 }),
  body('timeline.*.label').optional().trim().isLength({ max: 120 }),
  body('timeline.*.text').optional().trim().isLength({ max: 2000 }),
];

const investmentFields = [
  body('investment').optional().isObject().withMessage('investment must be an object'),
  body('investment.money').optional().trim().isLength({ max: 120 }),
  body('investment.time').optional().trim().isLength({ max: 120 }),
  body('investment.tools').optional().isArray({ max: 30 }),
  body('investment.tools.*').optional().trim().isString().isLength({ max: 60 }),
];

function sharedFields(required) {
  const req = required;
  return [
    req ? titleField(body('title')) : body('title').optional().trim().notEmpty().isLength({ max: 160 }),
    categoryField(body('category'), req),
    goalField(body('goal'), req),
    descriptionField(body('description'), req),
    outcomeField(body('outcome'), req),
    body('country').optional().trim().isLength({ max: 80 }),
    body('duration').optional().trim().isLength({ max: 80 }),
    body('investmentDisplay').optional().trim().isLength({ max: 120 }),
    body('mainObstacle').optional().trim().isLength({ max: 300 }),
    body('privacy').optional().isIn(PRIVACY).withMessage(`Privacy must be one of: ${PRIVACY.join(', ')}`),
    body('tags').optional().isArray({ max: 20 }).withMessage('Tags must be an array'),
    body('tags.*').optional().trim().isString().isLength({ max: 40 }),
    ...startingPointFields,
    ...timelineFields,
    ...investmentFields,
    body('obstacles').optional().isArray({ max: 50 }),
    body('obstacles.*').optional().trim().isString().isLength({ max: 1000 }),
    body('whatWorked').optional().isArray({ max: 50 }),
    body('whatWorked.*').optional().trim().isString().isLength({ max: 1000 }),
    body('lessons').optional().isArray({ max: 50 }),
    body('lessons.*').optional().trim().isString().isLength({ max: 1000 }),
    body('doDifferently').optional().isArray({ max: 50 }),
    body('doDifferently.*').optional().trim().isString().isLength({ max: 1000 }),
  ];
}

export const createExperienceValidator = sharedFields(true);
export const updateExperienceValidator = sharedFields(false);
