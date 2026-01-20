import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';
import { safeStorage } from '@/lib/storage';

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
});

// Request interceptor
request.interceptors.request.use(
  config => {
    // Get token from localStorage
    const token = safeStorage.getItem('token');
    const userId = safeStorage.getItem('userId');
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    if (userId) {
      config.headers['X-User-Id'] = userId;
    }
    return config;
  },
  error => {
    console.error(error);
    return Promise.reject(error);
  }
);

// Response interceptor
request.interceptors.response.use(
  res => {
    // RuoYi standard response structure
    // code: 200 success, 401 unauthorized, 500 error
    const code = res.data.code || 200;
    const msg = res.data.msg || 'Unknown Error';

    if (code === 401) {
      // Token expired or invalid
      safeStorage.removeItem('token');
      // Ideally trigger a logout action or redirect
      // For now just warn
      toast.error('登录状态已过期，请重新登录');
      return Promise.reject('无效的会话，或者会话已过期，请重新登录。');
    } else if (code === 500) {
      toast.error(msg);
      return Promise.reject(new Error(msg));
    } else if (code !== 200) {
      if (!(res.config as any).skipToast && code !== 404) {
        toast.error(msg);
      }
      return Promise.reject({ code, msg });
    } else {
      return res.data;
    }
  },
  error => {
    let { message } = error;
    if (message == "Network Error") {
      message = "后端接口连接异常";
    } else if (message.includes("timeout")) {
      message = "系统接口请求超时";
    } else if (message.includes("Request failed with status code")) {
      message = "系统接口" + message.substr(message.length - 3) + "异常";
    }
    toast.error(message);
    return Promise.reject(error);
  }
);

export default request;
