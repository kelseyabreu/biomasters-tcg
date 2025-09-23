/**
 * ApiToastProvider Component
 * 
 * Provides centralized toast notifications for API requests.
 * Works with the useApiRequest hook to show consistent success/error messages.
 */

import React, { useEffect, useState } from 'react';
import { IonToast } from '@ionic/react';

interface ToastEvent {
  message: string;
  color: 'success' | 'danger' | 'warning' | 'primary';
  duration?: number;
}

interface ToastState extends ToastEvent {
  isOpen: boolean;
  id: number;
}

export const ApiToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  useEffect(() => {
    const handleApiToast = (event: CustomEvent<ToastEvent>) => {
      const newToast: ToastState = {
        ...event.detail,
        isOpen: true,
        id: toastCounter,
        duration: event.detail.duration || 3000
      };
      
      setToasts(prev => [...prev, newToast]);
      setToastCounter(prev => prev + 1);
    };

    // Listen for toast events from useApiRequest hook
    window.addEventListener('api:toast', handleApiToast as EventListener);

    return () => {
      window.removeEventListener('api:toast', handleApiToast as EventListener);
    };
  }, [toastCounter]);

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <>
      {children}
      {toasts.map(toast => (
        <IonToast
          key={toast.id}
          isOpen={toast.isOpen}
          message={toast.message}
          duration={toast.duration}
          color={toast.color}
          position="bottom"
          onDidDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </>
  );
};
