// DEADEND API entry point.
// Adapter selection:
//   - VITE_API_MODE=rest            -> REST (Express) adapter
//   - VITE_API_MODE=mock            -> mock adapter (localStorage demo data)
//   - VITE_API_URL set (MODE unset) -> REST adapter (production default)
//   - otherwise                     -> mock adapter

import mockAdapter from './mockAdapter.js';
import restAdapter from './restAdapter.js';

const envMode = import.meta.env.VITE_API_MODE;
const apiUrl = import.meta.env.VITE_API_URL;

const mode =
  envMode || (apiUrl ? 'rest' : 'mock');

export const api = mode === 'rest' ? restAdapter : mockAdapter;

export const apiMode = mode;

export default api;
