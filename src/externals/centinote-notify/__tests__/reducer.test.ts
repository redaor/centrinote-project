import { notificationReducer } from '../NotifyProvider';
import type { NotificationState, NotificationActionType } from '../types';

describe('notificationReducer', () => {
  const initialState: NotificationState = {
    notifications: [],
    aggregated: [],
    isRetracted: false,
    isVisible: false,
  };

  it('should handle ADD action', () => {
    const action: NotificationActionType = {
      type: 'ADD',
      payload: {
        level: 'info',
        title: 'Test',
        body: 'Test body',
      },
    };

    const newState = notificationReducer(initialState, action);

    expect(newState.notifications).toHaveLength(1);
    expect(newState.notifications[0].title).toBe('Test');
    expect(newState.isVisible).toBe(true);
    expect(newState.isRetracted).toBe(false);
  });

  it('should handle REMOVE action', () => {
    const stateWithNotification: NotificationState = {
      notifications: [
        {
          id: 'test-1',
          level: 'info',
          title: 'Test',
          body: 'Test body',
          timestamp: Date.now(),
        },
      ],
      aggregated: [],
      isRetracted: false,
      isVisible: true,
    };

    const action: NotificationActionType = {
      type: 'REMOVE',
      payload: 'test-1',
    };

    const newState = notificationReducer(stateWithNotification, action);

    expect(newState.notifications).toHaveLength(0);
    expect(newState.isVisible).toBe(false);
  });

  it('should handle AGGREGATE action', () => {
    const notifications = [
      {
        id: 'test-1',
        level: 'info' as const,
        title: 'Test 1',
        body: 'Body 1',
        timestamp: Date.now(),
      },
      {
        id: 'test-2',
        level: 'success' as const,
        title: 'Test 2',
        body: 'Body 2',
        timestamp: Date.now(),
      },
    ];

    const action: NotificationActionType = {
      type: 'AGGREGATE',
      payload: notifications,
    };

    const newState = notificationReducer(initialState, action);

    expect(newState.aggregated).toHaveLength(2);
    expect(newState.notifications).toHaveLength(0);
    expect(newState.isVisible).toBe(true);
  });

  it('should handle CLEAR_AGGREGATED action', () => {
    const stateWithAggregated: NotificationState = {
      notifications: [],
      aggregated: [
        {
          id: 'test-1',
          level: 'info',
          title: 'Test',
          body: 'Test body',
          timestamp: Date.now(),
        },
      ],
      isRetracted: false,
      isVisible: true,
    };

    const action: NotificationActionType = {
      type: 'CLEAR_AGGREGATED',
    };

    const newState = notificationReducer(stateWithAggregated, action);

    expect(newState.aggregated).toHaveLength(0);
    expect(newState.isVisible).toBe(false);
  });

  it('should handle RETRACT action', () => {
    const action: NotificationActionType = {
      type: 'RETRACT',
    };

    const newState = notificationReducer(initialState, action);

    expect(newState.isRetracted).toBe(true);
  });

  it('should handle EXPAND action', () => {
    const retractedState: NotificationState = {
      ...initialState,
      isRetracted: true,
    };

    const action: NotificationActionType = {
      type: 'EXPAND',
    };

    const newState = notificationReducer(retractedState, action);

    expect(newState.isRetracted).toBe(false);
  });

  it('should handle HIDE action', () => {
    const visibleState: NotificationState = {
      ...initialState,
      isVisible: true,
    };

    const action: NotificationActionType = {
      type: 'HIDE',
    };

    const newState = notificationReducer(visibleState, action);

    expect(newState.isVisible).toBe(false);
  });

  it('should handle SHOW action', () => {
    const action: NotificationActionType = {
      type: 'SHOW',
    };

    const newState = notificationReducer(initialState, action);

    expect(newState.isVisible).toBe(true);
  });
});

