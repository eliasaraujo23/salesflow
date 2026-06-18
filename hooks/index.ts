// Auth hooks
export { useLogin } from './use-login';
export { useLogout } from './use-logout';

// Task hooks
export { useCreateTask } from './use-create-task';
export { useUpdateTask } from './use-update-task';
export { useDeleteTask } from './use-delete-task';

// Dashboard hooks
export { useJfDashboard } from './use-jf-dashboard';
export { useJmDashboard } from './use-jm-dashboard';

// Feature hooks
export { useMaintenance } from './use-maintenance';
export { useResale } from './use-resale';
export { usePartnerSales, usePartnerConsignments } from './use-partners';
export { usePhotoBags, useCreatePhotoBag, useUpdatePhotoBag, useDeletePhotoBag } from './use-photo-bags';
export { useIsMobile } from './use-mobile';

// Firebase hook
export { useFirebase } from '@/components/firebase-provider';
