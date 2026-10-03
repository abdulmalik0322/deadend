// DEADEND API entry point.
// Selects the adapter based on VITE_API_MODE ('mock' default, 'rest' for Express).

import mockAdapter from './mockAdapter.js';
import restAdapter from './restAdapter.js';

const mode = import.meta.env.VITE_API_MODE || 'mock';

export const api = mode === 'rest' ? restAdapter : mockAdapter;

export default api;
