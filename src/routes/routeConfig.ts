/**
 * HEALML Enterprise – Centralized Route Configuration
 * Comprehensive route definitions, role guards, and URL synchronization.
 */

export type UserRole = 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN' | 'MASTER_ADMIN';

export interface RouteDefinition {
  id: string;
  path: string;
  label: string;
  aliases: string[];
  requiredRole?: 'CLIENT' | 'ADMIN' | 'ANY';
  section: 'client' | 'admin' | 'public' | 'system';
  adminSubTab?: string;
}

export const APP_ROUTES: RouteDefinition[] = [
  // Client Workspace
  { id: 'overview', path: '/overview', label: 'Dashboard Overview', aliases: ['/', '/dashboard', '/overview'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'projects', path: '/projects', label: 'Project Workspaces', aliases: ['/projects', '/workspaces'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'upload', path: '/upload', label: 'Upload Dataset', aliases: ['/upload', '/upload-dataset'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'explorer', path: '/explorer', label: 'Dataset Explorer', aliases: ['/explorer', '/workspace', '/dataset', '/dataset-explorer'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'data_health', path: '/data-health', label: 'Data Health & Anomaly Scan', aliases: ['/data-health', '/health-scan', '/anomalies'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'detect', path: '/detect', label: 'Problem Detection', aliases: ['/detect', '/problems', '/faults', '/problem-detection'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'heal', path: '/heal', label: 'Self-Healing Engine', aliases: ['/heal', '/self-healing', '/heal-dataset', '/pipeline'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'updated', path: '/updated', label: 'Updated Dataset', aliases: ['/updated', '/updated-dataset', '/repaired-dataset', '/repaired'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'history', path: '/history', label: 'Dataset History', aliases: ['/history', '/dataset-history', '/dataset-inventory'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'training', path: '/training', label: 'ML Training Studio', aliases: ['/training', '/ml-training', '/studio', '/training-studio'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'evaluation', path: '/evaluation', label: 'Model Evaluation', aliases: ['/evaluation', '/model-evaluation', '/metrics'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'model_history', path: '/model-history', label: 'Model Version History', aliases: ['/model-history', '/model-versions', '/models'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'predictions', path: '/predictions', label: 'Prediction History', aliases: ['/predictions', '/prediction-history', '/inference'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'reports', path: '/reports', label: 'PDF Reports', aliases: ['/reports', '/pdf-reports', '/documentation'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'activity', path: '/activity', label: 'My Activity & Audit Ledger', aliases: ['/activity', '/logs', '/recovery-logs', '/audit-ledger'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'tickets', path: '/tickets', label: 'Support Tickets & Help', aliases: ['/tickets', '/support', '/help', '/support-tickets', '/help-requests'], requiredRole: 'CLIENT', section: 'client' },
  { id: 'settings', path: '/settings', label: 'Profile & Settings', aliases: ['/settings', '/profile', '/preferences'], requiredRole: 'CLIENT', section: 'client' },

  // Admin Workspace (Strictly Restricted to MASTER_ADMIN / ADMIN / SUPER_ADMIN)
  { id: 'admin_workstation', path: '/admin/workstation', label: 'Admin Workstation', aliases: ['/admin', '/admin_workstation', '/admin/workstation'], requiredRole: 'ADMIN', section: 'admin' },
  { id: 'model_operations', path: '/admin/model-operations', label: 'Full Model Operations Center', aliases: ['/model_operations', '/admin/model-operations', '/admin/models-fleet'], requiredRole: 'ADMIN', section: 'admin' },
  { id: 'admin_management', path: '/admin/management', label: 'Admin Management', aliases: ['/admin_management', '/admin/management', '/admin/overview'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'overview' },
  { id: 'admin_clients', path: '/admin/clients', label: 'Client Management', aliases: ['/admin/clients', '/admin/client-management'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'clients' },
  { id: 'admin_pending', path: '/admin/pending', label: 'Pending Registrations', aliases: ['/admin/pending', '/admin/pending-registrations'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'pending' },
  { id: 'admin_tickets', path: '/admin/tickets', label: 'Admin Help Requests', aliases: ['/admin/tickets', '/admin/help-requests'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'tickets' },
  { id: 'admin_models', path: '/admin/models', label: 'ML Model Monitoring', aliases: ['/admin/models', '/admin/ml-monitoring'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'models' },
  { id: 'admin_datasets', path: '/admin/datasets', label: 'Dataset Management', aliases: ['/admin/datasets', '/admin/dataset-management'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'datasets' },
  { id: 'admin_health', path: '/admin/health', label: 'System Health', aliases: ['/admin/health', '/admin/system-health'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'health' },
  { id: 'admin_issues', path: '/admin/issues', label: 'Critical Issues', aliases: ['/admin/issues', '/admin/critical-issues'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'issues' },
  { id: 'admin_reports', path: '/admin/reports', label: 'Admin Reports', aliases: ['/admin/reports', '/admin/compliance-reports'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'reports' },
  { id: 'admin_emails', path: '/admin/emails', label: 'Email Notifications', aliases: ['/admin/emails', '/admin/email-notifications'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'emails' },
  { id: 'admin_audit', path: '/admin/audit', label: 'Audit Logs', aliases: ['/admin/audit', '/admin/audit-logs'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'audit' },
  { id: 'admin_settings', path: '/admin/settings', label: 'Database & Settings', aliases: ['/admin/settings', '/admin/database-management', '/admin/backups'], requiredRole: 'ADMIN', section: 'admin', adminSubTab: 'settings' },

  // System & Guard Routes
  { id: 'access_denied', path: '/403', label: 'Access Denied', aliases: ['/403', '/access-denied', '/unauthorized'], requiredRole: 'ANY', section: 'system' },
  { id: 'not_found', path: '/404', label: 'Page Not Found', aliases: ['/404', '/not-found'], requiredRole: 'ANY', section: 'system' }
];

/**
 * Resolves a raw URL path or tab ID string to a canonical RouteDefinition.
 */
export function resolveRoute(input: string): RouteDefinition {
  if (!input || typeof input !== 'string') {
    return APP_ROUTES[0]; // overview
  }

  // Clean input: remove query string, hash, trailing slashes
  let clean = String(input).split('?')[0].split('#')[0].trim();
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }

  // Check direct ID match
  const byId = APP_ROUTES.find((r) => r.id === clean || r.id === clean.replace(/^\//, ''));
  if (byId) return byId;

  // Check path or aliases
  const byPath = APP_ROUTES.find((r) => {
    if (r.path === clean) return true;
    return r.aliases.includes(clean) || r.aliases.includes(`/${clean}`);
  });
  if (byPath) return byPath;

  // Unknown route -> return not_found definition
  return APP_ROUTES.find((r) => r.id === 'not_found') || APP_ROUTES[0];
}

/**
 * Check whether a user's role satisfies a route's required role.
 */
export function isAuthorizedForRoute(role: string | undefined, route: RouteDefinition): boolean {
  if (!route.requiredRole || route.requiredRole === 'ANY') {
    return true;
  }

  const isAdminRole = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MASTER_ADMIN';

  if (route.requiredRole === 'ADMIN') {
    return isAdminRole;
  }

  if (route.requiredRole === 'CLIENT') {
    // Both clients and admins can view client workspace routes
    return true;
  }

  return true;
}
