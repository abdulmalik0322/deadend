import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createDecisionValidator,
  updateDecisionValidator,
  decisionUpdateValidator,
  milestoneValidator,
  toggleMilestoneValidator,
  completeDecisionValidator,
  decisionIdParam,
  milestoneIdParam,
} from '../validators/decision.validator.js';
import * as c from '../controllers/decision.controller.js';

const router = Router();

// All decision routes are owner-scoped and require auth.
router.use(protect);

router.get('/', c.listDecisions);
router.post('/', createDecisionValidator, validate, c.createDecision);
router.get('/:id', decisionIdParam, validate, c.getDecision);
router.patch('/:id', decisionIdParam, updateDecisionValidator, validate, c.updateDecision);
router.delete('/:id', decisionIdParam, validate, c.deleteDecision);
router.post('/:id/updates', decisionIdParam, decisionUpdateValidator, validate, c.addUpdate);
router.post('/:id/milestones', decisionIdParam, milestoneValidator, validate, c.addMilestone);
router.patch(
  '/:id/milestones/:mid',
  decisionIdParam,
  milestoneIdParam,
  toggleMilestoneValidator,
  validate,
  c.toggleMilestone
);
router.post('/:id/complete', decisionIdParam, completeDecisionValidator, validate, c.completeDecision);
router.post('/:id/abandon', decisionIdParam, validate, c.abandonDecision);

export default router;
