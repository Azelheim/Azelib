import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';

interface TenantState {
  tenantId: string | null;
  tenantNama: string | null;
  userRole: string | null;
  userId: string | null;
  userEmail: string | null;
  isLoading: boolean;
  tokenValue: string | null;
  tokenNotification: string | null;
  setActiveTenant: (tenantId: string, tenantNama: string, role: string) => void;
  clearTenant: () => void;
  refreshTenant: () => Promise<void>;
  setTokenValue: (token: string) => void;
  clearTokenNotification: () => void;
}

const TenantContext = createContext<TenantState>({
  tenantId: null,
  tenantNama: null,
  userRole: null,
  userId: null,
  userEmail: null,
  isLoading: true,
  tokenValue: null,
  tokenNotification: null,
  setActiveTenant: () => {},
  clearTenant: () => {},
  refreshTenant: async () => {},
  setTokenValue: () => {},
  clearTokenNotification: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantNama, setTenantNama] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenValue, setTokenValue] = useState<string | null>(null);
  const [tokenNotification, setTokenNotification] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
      } else {
        setUserId(null);
        setUserEmail(null);
        setTenantId(null);
        setTenantNama(null);
        setUserRole(null);
        setTokenValue(null);
        setTokenNotification(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Global Realtime listener for tenant token updates across all roles
  useEffect(() => {
    if (!tenantId) return;

    console.log('[TOKEN-002][REALTIME-GLOBAL-INIT] Listening to tenant changes for:', tenantId);
    const channel = supabase
      .channel(`tenant-global-${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenant', filter: `id=eq.${tenantId}` },
        (payload: any) => {
          console.log('[TOKEN-002][REALTIME-GLOBAL-UPDATE] Payload:', payload);
          if (payload?.new?.qr_code_value) {
            const newToken = payload.new.qr_code_value;
            setTokenValue(newToken);
            setTokenNotification(`Token perpustakaan baru saja diperbarui: ${newToken}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
      }
    } catch (e) {
      console.error('Error checking session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveTenant = (id: string, nama: string, role: string) => {
    setTenantId(id);
    setTenantNama(nama);
    setUserRole(role);
  };

  const clearTenant = () => {
    setTenantId(null);
    setTenantNama(null);
    setUserRole(null);
    setTokenValue(null);
    setTokenNotification(null);
  };

  const clearTokenNotification = () => {
    setTokenNotification(null);
  };

  const refreshTenant = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('tenant_member')
        .select('tenant_id, role, tenant:tenant_id(nama, qr_code_value)')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!error && data) {
        setTenantId(data.tenant_id);
        setUserRole(data.role);
        // tenant is a joined object with nama
        const tenantObj = data.tenant as any;
        setTenantNama(tenantObj?.nama || null);
        if (tenantObj?.qr_code_value) {
          setTokenValue(tenantObj.qr_code_value);
        }
      }
    } catch (e) {
      console.error('Error refreshing tenant:', e);
    }
  };

  return (
    <TenantContext.Provider value={{
      tenantId, tenantNama, userRole, userId, userEmail, isLoading,
      tokenValue, tokenNotification,
      setActiveTenant, clearTenant, refreshTenant, setTokenValue, clearTokenNotification,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
