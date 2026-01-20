import { safeStorage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  name: string;
}

const USER_STORAGE_KEY = 'trmenu_user';

export const getUser = (): User => {
  try {
    const stored = safeStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse user from storage', e);
  }

  const newUser: User = {
    id: uuidv4(),
    name: `游客_${Math.floor(Math.random() * 9000) + 1000}`
  };

  safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  return newUser;
};

export const getCurrentUser = getUser;
