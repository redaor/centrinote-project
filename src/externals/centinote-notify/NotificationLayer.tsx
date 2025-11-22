import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { DynamicIsland } from './DynamicIsland';
import { useNotifyCtx } from './NotifyProvider';

export const NotificationLayer: React.FC = () => {
  const { notifications } = useNotifyCtx();

  return (
    <AnimatePresence mode="popLayout">
      {notifications.map((n) => (
        <DynamicIsland key={n.id} notification={n} />
      ))}
    </AnimatePresence>
  );
};
