'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { useUsersList } from '@/hooks/use-users-list';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useTasksLive } from '@/hooks/use-tasks-live';
import { useMetaisLive } from '@/hooks/use-metais-live';
import { useDeleteRequestsLive } from '@/hooks/use-delete-requests-live';

export interface AppUser {
  email: string;
  name: string;
  personKey: string;
  role: string;
  permissions: string[];
  cargo: string;
}

export interface Task {
  id: string | number;
  title: string;
  person: string;
  priority: string;
  status: string;
  due: string;
  late: number;
  createdAt?: any;
  description?: string;
}

export interface Metal {
  id: string | number;
  docId: string;
  tipo: 'entrada' | 'cadastro' | 'antigo';
  metal: 'ouro' | 'prata' | 'platina';
  chegou: number;
  cadastrado: number;
  sobrou: number;
  peso: number;
  origem: string;
  data: string;
  obs?: string;
  createdAt: number | string;
}

export interface DeleteRequest {
  docId: string;
  taskId: string | number;
  title?: string;
  requestedBy?: string;
  requestedByName?: string;
  createdAt: string;
}

interface FirebaseContextType {
  currentUser: AppUser | null;
  loading: boolean;
  tasks: Task[];
  metals: Metal[];
  users: AppUser[];
  deleteRequests: DeleteRequest[];
  logIn: (email: string, token: string, profile: any) => Promise<void>;
  logOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

const SESSION_MAX_MS = 12 * 60 * 60 * 1000;

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metals, setMetals] = useState<Metal[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserRef = useRef<AppUser | null>(null);

  const forceExpire = () => {
    signOut(auth).catch(() => {});
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('sf_user');
    localStorage.removeItem('sf_login_time');
    toast.info('Sessão expirada. Faça login novamente.');
  };

  const scheduleExpiry = (loginTime: number) => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    const remaining = SESSION_MAX_MS - (Date.now() - loginTime);
    if (remaining <= 0) { forceExpire(); return; }
    sessionTimerRef.current = setTimeout(forceExpire, remaining);
  };

  // Keep ref in sync so onAuthStateChanged callback can read latest value without stale closure
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Restore user session from localStorage on load (localStorage is shared across tabs)
  useEffect(() => {
    // Migrate: if sf_user was stored in sessionStorage (old behavior), move it to localStorage
    const legacyUser = sessionStorage.getItem('sf_user');
    if (legacyUser) {
      localStorage.setItem('sf_user', legacyUser);
      sessionStorage.removeItem('sf_user');
    }
    const savedUser = localStorage.getItem('sf_user');
    const loginTime = parseInt(localStorage.getItem('sf_login_time') || '0', 10);
    if (savedUser && loginTime) {
      if (Date.now() - loginTime >= SESSION_MAX_MS) {
        localStorage.removeItem('sf_user');
        localStorage.removeItem('sf_login_time');
      } else {
        setCurrentUser(JSON.parse(savedUser));
        scheduleExpiry(loginTime);
      }
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark Firebase Auth as ready. If Firebase Auth session is missing but app session exists → force re-login.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setFirebaseAuthReady(true);
      } else if (currentUserRef.current) {
        // App session active but Firebase Auth expired → Firestore reads would silently fail
        forceExpire();
      } else {
        setFirebaseAuthReady(true);
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dados de app (tasks, metais, pedidos de exclusão) agora vêm do Neon via
  // API com polling, não mais de onSnapshot em Firestore — ver plano de
  // migração Firestore→Neon. Só busca quando logado E com o Firebase Auth
  // pronto, preservando o mesmo gate de antes.
  const canFetchAppData = !!currentUser && firebaseAuthReady;
  const { data: tasksData } = useTasksLive(canFetchAppData);
  const { data: metalsData } = useMetaisLive(canFetchAppData);
  const { data: deleteRequestsData } = useDeleteRequestsLive(canFetchAppData);

  useEffect(() => {
    if (!canFetchAppData) {
      setTasks([]);
      setMetals([]);
      setDeleteRequests([]);
      return;
    }
    if (tasksData) setTasks(tasksData);
  }, [canFetchAppData, tasksData]);

  useEffect(() => {
    if (canFetchAppData && metalsData) setMetals(metalsData);
  }, [canFetchAppData, metalsData]);

  useEffect(() => {
    if (canFetchAppData && deleteRequestsData) setDeleteRequests(deleteRequestsData);
  }, [canFetchAppData, deleteRequestsData]);

  // Lista de usuários (admin) e auto-sync do próprio perfil — vêm do Neon via
  // API, não mais de Firestore usuarios/{email} (que ficou redundante desde
  // que role/permissions passaram a viver só no Neon, fonte real do JWT).
  const isLoggedIn = !!currentUser;
  const { data: usersListData } = useUsersList(isLoggedIn && currentUser?.role === 'admin');
  const { data: myProfileData } = useMyProfile(isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) { setUsers([]); return; }
    if (usersListData) setUsers(usersListData);
  }, [isLoggedIn, usersListData]);

  useEffect(() => {
    if (!myProfileData) return;
    setCurrentUser(prev => {
      if (!prev) return prev;
      const changed =
        myProfileData.role !== prev.role ||
        myProfileData.name !== prev.name ||
        myProfileData.cargo !== prev.cargo ||
        myProfileData.personKey !== prev.personKey ||
        JSON.stringify(myProfileData.permissions) !== JSON.stringify(prev.permissions);
      if (!changed) return prev;
      localStorage.setItem('sf_user', JSON.stringify(myProfileData));
      return myProfileData;
    });
  }, [myProfileData]);

  // Nota: token/cookie de sessão real (sf_session/sf_refresh) já foram definidos
  // pelo servidor (HttpOnly) na resposta de /api/auth/login. Aqui só populamos
  // o estado local/localStorage para exibição (nome, navegação) — nunca mais
  // uma fonte de autorização.
  const logIn = async (email: string, _token: string, profile: any) => {
    const user: AppUser = {
      email,
      name: profile.name,
      personKey: profile.personKey,
      role: profile.role,
      permissions: profile.permissions || [],
      cargo: profile.cargo || '',
    };
    setCurrentUser(user);
    localStorage.setItem('sf_user', JSON.stringify(user));
    const now = Date.now();
    localStorage.setItem('sf_login_time', now.toString());
    scheduleExpiry(now);
  };

  const logOut = async () => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    await signOut(auth);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('sf_user');
    localStorage.removeItem('sf_login_time');
    toast.success('Sessão encerrada com sucesso!');
  };

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        loading,
        tasks,
        metals,
        users,
        deleteRequests,
        logIn,
        logOut,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
