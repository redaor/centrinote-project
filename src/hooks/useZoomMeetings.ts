// DEPRECATED: This hook used the old OAuth system
// Please use useSimplifiedZoom instead for the new SDK approach

import { useSimplifiedZoom } from './useSimplifiedZoom';

/**
 * @deprecated Use useSimplifiedZoom instead
 * This hook now redirects to the new simplified SDK approach
 */
export function useZoomMeetings() {
  // Redirect to the new simplified hook for backward compatibility
  const simplifiedZoom = useSimplifiedZoom();
  
  return {
    // Legacy compatibility mapping
    meetings: simplifiedZoom.meetings,
    participants: [], // Not used in new system
    loading: simplifiedZoom.loadingMeetings,
    error: simplifiedZoom.connectionError,
    
    // Methods - mapped to new system
    createMeeting: simplifiedZoom.createMeeting,
    updateMeeting: () => Promise.resolve(null), // Not implemented yet
    cancelMeeting: () => Promise.resolve(false), // Not implemented yet
    sendInvitations: () => Promise.resolve(false), // Not implemented yet
    getStats: () => ({ 
      total_meetings: simplifiedZoom.meetings.length,
      upcoming_meetings: simplifiedZoom.meetings.filter(m => m.status === 'scheduled').length,
      total_participants: 0,
      average_duration: 60
    }),
    getMeetingParticipants: () => [],
    
    // New system access
    ...simplifiedZoom
  };
}