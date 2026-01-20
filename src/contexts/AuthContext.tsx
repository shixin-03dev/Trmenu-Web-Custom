import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as loginApi, getInfo as getInfoApi } from '@/api/auth';
import { toast } from 'sonner';
import { safeStorage } from '@/lib/storage';

interface User {
  userName: string;
  nickName: string;
  avatar: string;
  userId: number;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = safeStorage.getItem('token');
      if (token) {
        try {
          await refreshUser();
        } catch (error) {
          console.error("Failed to fetch user info", error);
          safeStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    const res: any = await getInfoApi();
    if (res.user) {
      setUser(res.user);
      safeStorage.setItem('userId', res.user.userId);
    }
  };

  const login = async (loginData: any) => {
    try {
      const res: any = await loginApi(loginData);
      if (res.token) {
        safeStorage.setItem('token', res.token);
        await refreshUser();
        toast.success('登录成功');
      }
    } catch (error) {
      // Error handled in interceptor mostly, but rethrow for UI handling
      throw error;
    }
  };

  const logout = () => {
    safeStorage.removeItem('token');
    safeStorage.removeItem('userId');
    setUser(null);
    toast.success('已退出登录');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      isAuthenticated: !!user,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
