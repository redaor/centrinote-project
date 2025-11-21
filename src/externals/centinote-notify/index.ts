// Centinote-Notify - Public API
export { NotifyProvider, useNotifyContext } from './NotifyProvider';
export { NotificationLayer } from './NotificationLayer';
export { useNotify } from './useNotify';
export { DynamicIsland } from './DynamicIsland';
export * from './types';
export { initializePushNotifications } from './serviceWorker';

// Default export for convenience
import { NotifyProvider } from './NotifyProvider';
import { NotificationLayer } from './NotificationLayer';
import { useNotify } from './useNotify';

export default {
  NotifyProvider,
  NotificationLayer,
  useNotify,
};

