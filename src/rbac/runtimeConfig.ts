import { UserRole } from './types';

export const SINGLE_ROLE_MODE = import.meta.env.VITE_SINGLE_ROLE_MODE === 'true';
export const SINGLE_TEST_ROLE: UserRole = 'Super Admin';
