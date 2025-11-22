import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { DynamicIsland } from './DynamicIsland';
import { useNotifyCtx } from './NotifyProvider';

export const NotificationLayer: React.FC = () => {
  const { notifications } = useNotifyCtx();

  return (
    <AnimatePresence mode="wait">
      {notifications.map((n) => (
        <DynamicIsland key={n.id} notification={n} />
      ))}
    </AnimatePresence>
  );
};
