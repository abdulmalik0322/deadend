import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createDecisionValidator,
  updateDecisionValidator,
  decisionUpdateValidator,
  milestoneValidator,
} from '../validators/decision.validator.js';
import * as c from '../controllers/decision.controller.js';

const router = Router();

// All decision routes are owner-scoped and require auth.
router.use(protect);

router.get('/', c.listDecisions);
router.post('/', createDecisionValidator, validate, c.createDecision);
router.get('/:id', c.getDecision);
router.patch('/:id', updateDecisionValidator, validate, c.updateDecision);
router.delete('/:id', c.deleteDecision);
router.post('/:id/updates', decisionUpdateValidator, validate, c.addUpdate);
router.post('/:id/milestones', milestoneValidator, validate, c.addMilestone);
router.patch('/:id/milestones/:milestoneId', c.toggleMilestone);
router.post('/:id/complete', c.completeDecision);
router.post('/:id/abandon', c.abandonDecision);

export default router;
