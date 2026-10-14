'use client';
import { useState } from 'react';
import type { DemoUser } from '@/types/user';
import type { RoleName } from '@/types';
import { createDemoUser, toggleDemoUser, changeDemoUserRole } from '@/services/userService';
export function useDemoUsers(role: RoleName, log: (action: string, details: string) => void, author: string = role) {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const addUser = (name: string, email: string, userRole: RoleName) => {
    const user = createDemoUser(name, email, userRole, users, role, author);
    setUsers(previous => [...previous, user]); log('Création utilisateur simulé', JSON.stringify({ entity: user.id, oldValue: null, newValue: { name: user.name, role: user.role } }));
  };
  const toggleUser = (id: string, reason: string) => {
    const user = users.find(item => item.id === id);
    if (!user) throw new Error('Utilisateur introuvable.');
    const updated = toggleDemoUser(user, reason, role, author);
    setUsers(previous => previous.map(item => item.id === id ? updated : item)); log('Statut utilisateur simulé', JSON.stringify({ entity: id, oldValue: user.active, newValue: updated.active, reason }));
  };
  const changeUserRole = (id: string, target: RoleName, reason: string) => {
    const user = users.find(item => item.id === id);
    if (!user) throw new Error('Utilisateur introuvable.');
    const updated = changeDemoUserRole(user, target, reason, role, author);
    setUsers(previous => previous.map(item => item.id === id ? updated : item));
    log('Rôle utilisateur simulé', JSON.stringify({ entity: id, oldValue: user.role, newValue: target, reason }));
  };
  return { users, addUser, toggleUser, changeUserRole };
}
