import { useNotifyContext } from './NotifyProvider';
import type { NotificationLevel, NotificationAction } from './types';

export function useNotify() {
  const { notify } = useNotifyContext();

  return {
    notify: (params: {
      level: NotificationLevel;
      title: string;
      body: string;
      actions?: NotificationAction[];
      icon?: string;
    }) => {
      notify(params);
    },
  };
}

