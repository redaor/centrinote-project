import React from 'react';
import { useNotifyContext } from './NotifyProvider';
import { DynamicIsland } from './DynamicIsland';

interface NotificationLayerProps {
  theme?: 'light' | 'dark';
}

export function NotificationLayer({ theme = 'light' }: NotificationLayerProps) {
  const { state, removeNotification } = useNotifyContext();

  const handleRetract = () => {
    // Retract logic is handled by the provider
  };

  const handleExpand = () => {
    // Expand logic is handled by the provider
  };

  const handleClearAggregated = () => {
    clearAggregated();
  };

  const currentNotification =
    state.notifications.length > 0 ? state.notifications[state.notifications.length - 1] : null;

  return (
    <DynamicIsland
      notification={currentNotification}
      aggregated={state.aggregated}
      isRetracted={state.isRetracted}
      isVisible={state.isVisible}
      onRetract={handleRetract}
      onExpand={handleExpand}
      onRemove={removeNotification}
      onClearAggregated={handleClearAggregated}
      theme={theme}
    />
  );
}

