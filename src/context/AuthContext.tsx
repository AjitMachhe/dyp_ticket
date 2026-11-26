import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Institution, Department, UserProfile, UserRole } from '../types/database';
import { ROLE_CONFIG, type RoleMeta } from '../lib/rbac';

interface AuthContextType {
  profile: UserProfile | null;
  activeRole: UserRole;
  roleMeta: RoleMeta;
  selectedInstitutionId: string; // 'ALL' or institution UUID
  setSelectedInstitutionId: (id: string) => void;
  institutions: Institution[];
  departments: Department[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    institution_id: string;
    department_id?: string;
    employee_or_prn_id?: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: UserRole, institutionId?: string) => void;
  refreshMetadata: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_DEFAULT_INSTITUTION = '22222222-2222-2222-2222-222222222222'; // Engineering College

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('university_admin');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('ALL');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMetadata = async () => {
    const [{ data: instData }, { data: deptData }] = await Promise.all([
      supabase.from('institutions').select('*').eq('is_active', true).order('name'),
      supabase.from('departments').select('*').eq('is_active', true).order('name'),
    ]);
    if (instData) setInstitutions(instData);
    if (deptData) setDepartments(deptData);
  };

  const loadUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, institution:institutions(*), department:departments(*)')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data as UserProfile);
      setActiveRole(data.role as UserRole);
      if (data.role === 'college_admin' && data.institution_id) {
        setSelectedInstitutionId(data.institution_id);
      } else {
        setSelectedInstitutionId('ALL');
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      await refreshMetadata();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signUp = async (formData: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    institution_id: string;
    department_id?: string;
    employee_or_prn_id?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    if (error) return { error: error.message };

    if (data.user) {
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        institution_id: formData.institution_id || null,
        department_id: formData.department_id || null,
        employee_or_prn_id: formData.employee_or_prn_id || null,
      });
      if (profileErr) return { error: profileErr.message };
      await loadUserProfile(data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  // Allows instant testing of any of the 8 roles in the UI
  const switchDemoRole = (role: UserRole, institutionId?: string) => {
    setActiveRole(role);
    const meta = ROLE_CONFIG[role];
    if (meta.scope === 'all') {
      setSelectedInstitutionId('ALL');
    } else {
      const targetInst = institutionId || profile?.institution_id || DEMO_DEFAULT_INSTITUTION;
      setSelectedInstitutionId(targetInst);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        activeRole,
        roleMeta: ROLE_CONFIG[activeRole],
        selectedInstitutionId,
        setSelectedInstitutionId,
        institutions,
        departments,
        loading,
        signIn,
        signUp,
        signOut,
        switchDemoRole,
        refreshMetadata,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};