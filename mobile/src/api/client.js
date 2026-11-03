import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// The address of the Wesoxch server. Change only this line when the server moves.
const SERVER = 'http://localhost:5000';

export const BASE_SERVER_URL = SERVER;

const UPLOAD_URL = /^https?:\/\/[^/]+(\/uploads\/.*)$/;

// Photos are stored as "/uploads/..." paths. This gives the full address to show them.
export const fileUrl = (value) => {
  if (typeof value !== 'string') return value;
  if (value.startsWith('/uploads/')) return SERVER + value;
  const m = value.match(UPLOAD_URL);
  return m ? SERVER + m[1] : value;
};

// And this goes the other way, so only the path is ever saved.
const toPath = (value) => {
  if (typeof value !== 'string') return value;
  const m = value.match(UPLOAD_URL);
  return m ? m[1] : value;
};

const mapDeep = (v, fn) => {
  if (Array.isArray(v)) return v.map(x => mapDeep(x, fn));
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = mapDeep(v[k], fn);
    return out;
  }
  return fn(v);
};

const api = axios.create({ baseURL: SERVER + '/api', timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('wesoxch_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = mapDeep(config.data, toPath);
  }
  return config;
});

api.interceptors.response.use((res) => {
  if (res.data && typeof res.data === 'object') res.data = mapDeep(res.data, fileUrl);
  return res;
});

export default api;
