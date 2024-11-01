import type { SharedSlice } from '@/store';
import type { StateCreator } from 'zustand';

const DEFAULT_URL = import.meta.env.DEV ? '/brp' : 'http://localhost:15702';

export type SessionSlice = {
  brpUrl: string;
};

export const createSessionSlice: StateCreator<SharedSlice, [], [], SessionSlice> = () => ({
  brpUrl: localStorage.getItem('brp_url') || DEFAULT_URL,
});
