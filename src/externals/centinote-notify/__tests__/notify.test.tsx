import { renderHook, act } from '@testing-library/react';
import { NotifyProvider, useNotifyContext } from '../NotifyProvider';
import { useNotify } from '../useNotify';
import React from 'react';

describe('NotifyProvider', () => {
  it('should provide notify function', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotifyProvider>{children}</NotifyProvider>
    );

    const { result } = renderHook(() => useNotifyContext(), { wrapper });

    expect(result.current.notify).toBeDefined();
    expect(result.current.removeNotification).toBeDefined();
    expect(result.current.state).toBeDefined();
  });

  it('should add notification', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotifyProvider>{children}</NotifyProvider>
    );

    const { result } = renderHook(() => useNotifyContext(), { wrapper });

    act(() => {
      result.current.notify({
        level: 'info',
        title: 'Test',
        body: 'Test body',
      });
    });

    expect(result.current.state.notifications).toHaveLength(1);
    expect(result.current.state.notifications[0].title).toBe('Test');
    expect(result.current.state.isVisible).toBe(true);
  });

  it('should remove notification', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotifyProvider>{children}</NotifyProvider>
    );

    const { result } = renderHook(() => useNotifyContext(), { wrapper });

    act(() => {
      result.current.notify({
        level: 'info',
        title: 'Test',
        body: 'Test body',
      });
    });

    const notificationId = result.current.state.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.state.notifications).toHaveLength(0);
  });

  it('should aggregate multiple notifications', async () => {
    jest.useFakeTimers();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotifyProvider aggregationWindow={5000}>{children}</NotifyProvider>
    );

    const { result } = renderHook(() => useNotifyContext(), { wrapper });

    act(() => {
      result.current.notify({
        level: 'info',
        title: 'Notification 1',
        body: 'Body 1',
      });
    });

    act(() => {
      result.current.notify({
        level: 'success',
        title: 'Notification 2',
        body: 'Body 2',
      });
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.state.aggregated.length).toBeGreaterThan(1);
    expect(result.current.state.notifications).toHaveLength(0);

    jest.useRealTimers();
  });
});

describe('useNotify', () => {
  it('should return notify function', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotifyProvider>{children}</NotifyProvider>
    );

    const { result } = renderHook(() => useNotify(), { wrapper });

    expect(result.current.notify).toBeDefined();
  });

  it('should call notify with correct parameters', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotifyProvider>{children}</NotifyProvider>
    );

    const { result } = renderHook(() => useNotify(), { wrapper });

    act(() => {
      result.current.notify({
        level: 'success',
        title: 'Success',
        body: 'Operation successful',
        icon: '✅',
      });
    });

    // Verify through context
    const { result: contextResult } = renderHook(() => useNotifyContext(), { wrapper });
    expect(contextResult.current.state.notifications[0].title).toBe('Success');
  });
});

