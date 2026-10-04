import { Notification } from '../models/Notification.js';

/**
 * Best-effort in-app notification helper.
 * Skips when there is no recipient; never throws — a notification must
 * never break the request that caused it.
 *
 * @param {string|ObjectId} userId - the recipient's user id
 * @param {{ type: string, title: string, body?: string, link?: string }} payload
 * @returns {Promise<import('mongoose').Document|undefined>} the created Notification, or undefined
 */
export async function notify(userId, { type, title, body = '', link = '' } = {}) {
  if (!userId) return undefined;
  try {
    return await Notification.create({ user: userId, type, title, body, link });
  } catch {
    return undefined;
  }
}
