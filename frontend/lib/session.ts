import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const LAST_ACTIVE_TENANT_KEY = 'azelib_last_active_tenant';

export interface SavedTenantSession {
  id: string;
  nama: string;
  role: string;
}

/**
 * Saves the last active library chosen by the user.
 */
export async function saveLastActiveTenant(tenant: SavedTenantSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_ACTIVE_TENANT_KEY, JSON.stringify(tenant));
  } catch (e) {
    console.error('Error saving last active tenant:', e);
  }
}

/**
 * Retrieves the last active library if available.
 */
export async function getLastActiveTenant(): Promise<SavedTenantSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_ACTIVE_TENANT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedTenantSession;
  } catch (e) {
    console.error('Error getting last active tenant:', e);
    return null;
  }
}

/**
 * Clears the last active library (called upon "Keluar Perpustakaan" or "Keluar Akun").
 */
export async function clearLastActiveTenant(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LAST_ACTIVE_TENANT_KEY);
  } catch (e) {
    console.error('Error clearing last active tenant:', e);
  }
}

/**
 * Full account logout (called ONLY by "Keluar Akun").
 */
export async function logoutAccount(): Promise<void> {
  try {
    await clearLastActiveTenant();
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Error during full account logout:', e);
  }
}
