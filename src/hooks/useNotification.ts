import { useCallback } from 'react';

interface NotificationData {
  title: string;
  body: string;
}

export const useNotification = () => {
  const sendNotification = useCallback(async (data: NotificationData) => {
    try {
      console.log('Notification:', data);
      // For now, just console log - in a real app this would send actual notifications
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, []);

  return sendNotification;
}; 