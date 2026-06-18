'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast } from 'sonner';

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
  tipo: 'entrada' | 'cadastro' | 'antigo';
  metal: 'ouro' | 'prata' | 'platina';
  peso: number;
  detalhe?: string;
  responsavel: string;
  createdAt: string;
}

export interface DeleteRequest {
  docId: string;
  taskId: string | number;
  requester: string;
  reason: string;
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

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metals, setMetals] = useState<Metal[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);

  // Restore user session from sessionStorage on load
  useEffect(() => {
    const savedUser = sessionStorage.getItem('sf_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Listen for database collections when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setMetals([]);
      setUsers([]);
      setDeleteRequests([]);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Subscribe to Tasks (real-time stream)
    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snap) => {
      const parsedTasks = snap.docs.map((d) => {
        const data = d.data() as any;
        const task = {
          ...data,
          id: isNaN(Number(data.id)) ? d.id : Number(data.id),
        } as Task;

        // Recalculate delays on the client side
        if (task.status !== 'done' && task.due && task.due !== 'Sem prazo') {
          const parts = task.due.split('/');
          const dueDate = parts.length === 3 ? new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])) : null;
          task.late = dueDate ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000)) : 0;
        } else {
          task.late = 0;
        }

        return task;
      });
      setTasks(parsedTasks);
    });

    // Subscribe to Metals
    const metalsQuery = query(collection(db, 'metais'), orderBy('createdAt', 'desc'));
    const unsubscribeMetals = onSnapshot(metalsQuery, (snap) => {
      const parsedMetals = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: isNaN(Number(data.id)) ? d.id : Number(data.id),
        } as Metal;
      });
      setMetals(parsedMetals);
    });

    // Subscribe to Users
    const unsubscribeUsers = onSnapshot(collection(db, 'usuarios'), (snap) => {
      const parsedUsers = snap.docs.map((d) => {
        const data = d.data();
        return {
          email: d.id,
          name: data.name || d.id,
          personKey: data.personKey || '',
          role: data.role || 'user',
          permissions: data.permissions || [],
          cargo: data.cargo || 'Colaborador',
        } as AppUser;
      });
      setUsers(parsedUsers);
    });

    // Subscribe to Delete Requests
    const unsubscribeDeleteRequests = onSnapshot(collection(db, 'task_delete_requests'), (snap) => {
      const parsedRequests = snap.docs.map((d) => {
        const data = d.data();
        return {
          docId: d.id,
          ...data,
        } as DeleteRequest;
      });
      setDeleteRequests(parsedRequests);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeMetals();
      unsubscribeUsers();
      unsubscribeDeleteRequests();
    };
  }, [currentUser]);

  const logIn = async (email: string, token: string, profile: any) => {
    await signInWithCustomToken(auth, token);
    const user: AppUser = {
      email,
      name: profile.name,
      personKey: profile.personKey,
      role: profile.role,
      permissions: profile.permissions || [],
      cargo: profile.cargo || '',
    };
    setCurrentUser(user);
    sessionStorage.setItem('sf_user', JSON.stringify(user));
    localStorage.setItem('sf_login_time', Date.now().toString());
  };

  const logOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
    sessionStorage.removeItem('sf_user');
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
