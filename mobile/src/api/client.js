import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Switch between local and production
const LOCAL = 'http://localhost:5000/api';
const PROD = 'https://wesoxch-backend.onrender.com/api';

const BASE_URL = LOCAL;
export const BASE_SERVER_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('wesoxch_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
