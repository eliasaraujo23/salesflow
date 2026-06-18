// DEPRECATED: Use lib/actions/* instead for all actions
// This file only serves as a legacy import location

// Re-export from new locations for backwards compatibility
export type { ResponseApi } from './actions/login';
export { fetchJfDashboardAction, type JfDashboardFeed } from './actions/fetch-jf-dashboard';
export { fetchJmDashboardAction, type JmDashboardFeed } from './actions/fetch-jm-dashboard';
export { fetchMaintenanceAction, type MaintenanceItem } from './actions/fetch-maintenance';
export { fetchResaleAction, type ResellItem } from './actions/fetch-resale';
export {
  fetchPartnerSalesAction,
  fetchPartnerConsignmentsAction,
  type PartnerSales,
  type PartnerConsignment,
} from './actions/fetch-partners';
export {
  fetchPhotoBagsAction,
  createPhotoBagAction,
  updatePhotoBagAction,
  deletePhotoBagAction,
  type PhotoBag,
} from './actions/photo-bags';
