import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: authToken, user } = response.data;

    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(user));

    setToken(authToken);
    setUser(user);

    return user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUserContext = (updatedFields) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, socket, updateUserContext }),
    [user, token, loading, socket]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
