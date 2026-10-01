import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('wesoxch_token');
      if (token) {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      }
    } catch (err) {
      await SecureStore.deleteItemAsync('wesoxch_token');
    } finally { setLoading(false); }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch (err) {}
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('wesoxch_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('wesoxch_token');
    setUser(null);
    setUnreadCount(0);
  };

  const markNotificationsRead = async () => {
    try { await api.post('/notifications/mark-read'); setUnreadCount(0); } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, unreadCount, fetchUnreadCount, markNotificationsRead }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
