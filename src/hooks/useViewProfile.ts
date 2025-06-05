import { useCallback } from 'react';

export const useViewProfile = () => {
  const viewProfile = useCallback(() => {
    try {
      console.log('View profile requested');
      // For now, just console log - in a real app this would show profile
    } catch (error) {
      console.error('Error viewing profile:', error);
    }
  }, []);

  return viewProfile;
}; 