/**
 * Parse ?page and ?limit query params into a safe pagination object.
 * @param {import('express').Request} req
 * @param {{ defaultLimit?: number, maxLimit?: number }} [opts]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function getPagination(req, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(req.query.limit, 10) || defaultLimit)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
