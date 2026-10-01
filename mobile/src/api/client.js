import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://wesoxch-backend-production.up.railway.app/api';
export const BASE_SERVER_URL = 'https://wesoxch-backend-production.up.railway.app';

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
