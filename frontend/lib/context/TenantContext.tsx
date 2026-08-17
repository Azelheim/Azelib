import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';

interface TenantState {
  tenantId: string | null;
  tenantNama: string | null;
  userRole: string | null;
  userId: string | null;
  userEmail: string | null;
  isLoading: boolean;
  setActiveTenant: (tenantId: string, tenantNama: string, role: string) => void;
  clearTenant: () => void;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantState>({
  tenantId: null,
  tenantNama: null,
  userRole: null,
  userId: null,
  userEmail: null,
  isLoading: true,
  setActiveTenant: () => {},
  clearTenant: () => {},
  refreshTenant: async () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantNama, setTenantNama] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
  };

  const refreshTenant = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('tenant_member')
        .select('tenant_id, role, tenant:tenant_id(nama)')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!error && data) {
        setTenantId(data.tenant_id);
        setUserRole(data.role);
        // tenant is a joined object with nama
        const tenantObj = data.tenant as any;
        setTenantNama(tenantObj?.nama || null);
      }
    } catch (e) {
      console.error('Error refreshing tenant:', e);
    }
  };

  return (
    <TenantContext.Provider value={{
      tenantId, tenantNama, userRole, userId, userEmail, isLoading,
      setActiveTenant, clearTenant, refreshTenant,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
