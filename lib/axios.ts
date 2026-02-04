import axios from 'axios';
import { auth } from './firebase';

const axiosInstance = axios.create({
  baseURL: '/',
});

// リクエストインターセプター（すべてのリクエストにトークンを自動付与）
axiosInstance.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
