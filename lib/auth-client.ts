import { UserRole } from './types';

export function getInitials(name: string): string {
  return name
    .split('')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRoleBadgeConfig(role: UserRole) {
  switch (role) {
    case 'superadmin':
      return {
        label: 'Super Admin',
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-200',
      };
    case 'admin':
      return {
        label: 'Admin',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
    case 'operator':
      return {
        label: 'Operatör',
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
      };
  }
}
