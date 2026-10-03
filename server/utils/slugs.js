import slugify from 'slugify';

/**
 * Build a URL-safe slug from a title, appending -2, -3, ... until unique.
 * @param {import('mongoose').Model} Model Mongoose model with a `slug` field
 * @param {string} title Source title
 * @returns {Promise<string>} Unique slug
 */
export async function uniqueSlug(Model, title) {
  const base = slugify(String(title || ''), { lower: true, strict: true }) || 'untitled';
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}
