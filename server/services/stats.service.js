import { User } from '../models/User.js';
import { Experience } from '../models/Experience.js';
import { Decision } from '../models/Decision.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { Category } from '../models/Category.js';

/**
 * Platform-wide counts for dashboards / admin overview.
 * Pure aggregations — no business logic.
 */
export async function platformStats() {
  const [users, experiences, pendingExperiences, decisions, comments, openReports, categories] =
    await Promise.all([
      User.countDocuments(),
      Experience.countDocuments(),
      Experience.countDocuments({ status: 'pending' }),
      Decision.countDocuments(),
      Comment.countDocuments(),
      Report.countDocuments({ status: 'open' }),
      Category.countDocuments(),
    ]);

  return {
    users,
    experiences,
    pendingExperiences,
    decisions,
    comments,
    openReports,
    categories,
  };
}
