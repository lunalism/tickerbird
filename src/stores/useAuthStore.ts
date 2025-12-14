import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  toggleLogin: () => void;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  userName: '투자의신',
  toggleLogin: () => set((state) => ({ isLoggedIn: !state.isLoggedIn })),
  login: () => set({ isLoggedIn: true }),
  logout: () => set({ isLoggedIn: false }),
}));
