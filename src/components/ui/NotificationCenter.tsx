import React, { useState, useEffect } from 'react';
import {
  IonToast,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonText,
  IonBadge
} from '@ionic/react';
import {
  close,
  notificationsOutline,
  checkmarkCircle,
  alertCircle,
  informationCircle,
  warningOutline,
  search,
  star,
  trophy,
  gift,
  flame,
  trendingUp,
  trendingDown,
  medal,
  flash,
  wifiOutline,
  wifi,
  sync
} from 'ionicons/icons';
import { notificationService, NotificationData } from '../../services/notificationService';
import './NotificationCenter.css';

interface NotificationCenterProps {
  position?: 'top' | 'bottom' | 'floating';
  maxVisible?: number;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  position = 'top',
  maxVisible = 3
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showCenter, setShowCenter] = useState(false);

  useEffect(() => {
    // Subscribe to notification service
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => {
        const updated = [notification, ...prev];
        return updated.slice(0, maxVisible);
      });
    });

    // Load existing notifications
    setNotifications(notificationService.getActive().slice(0, maxVisible));

    return unsubscribe;
  }, [maxVisible]);

  const getNotificationIcon = (notification: NotificationData): string => {
    if (notification.icon) {
      // Map icon names to actual icons
      const iconMap: { [key: string]: string } = {
        'search': search,
        'checkmark-circle': checkmarkCircle,
        'close-circle': close,
        'alert-circle': alertCircle,
        'star': star,
        'trophy': trophy,
        'gift': gift,
        'flame': flame,
        'trending-up': trendingUp,
        'trending-down': trendingDown,
        'medal': medal,
        'flash': flash,
        'wifi-off': wifiOutline,
        'wifi': wifi,
        'sync': sync
      };
      return iconMap[notification.icon] || informationCircle;
    }

    // Default icons by type
    switch (notification.type) {
      case 'matchmaking':
        return search;
      case 'quest':
        return star;
      case 'rating':
        return trophy;
      case 'achievement':
        return medal;
      case 'system':
        return informationCircle;
      default:
        return informationCircle;
    }
  };

  const handleDismiss = (id: string) => {
    notificationService.dismiss(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    notificationService.clearAll();
    setNotifications([]);
    setShowCenter(false);
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      {/* Floating Notification Cards */}
      <div className={`notification-container notification-${position}`}>
        {notifications.map((notification, index) => (
          <IonCard
            key={notification.id}
            className={`notification-card notification-${notification.type} notification-${notification.color}`}
            style={{
              transform: `translateY(${index * 10}px)`,
              zIndex: 1000 - index,
              opacity: 1 - (index * 0.1)
            }}
          >
            <IonCardContent>
              <div className="notification-content">
                <div className="notification-icon">
                  <IonIcon
                    icon={getNotificationIcon(notification)}
                    color={notification.color}
                  />
                </div>
                <div className="notification-text">
                  <div className="notification-title">
                    {notification.title}
                  </div>
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    {formatTimeAgo(notification.timestamp)}
                  </div>
                </div>
                <div className="notification-actions">
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => handleDismiss(notification.id)}
                  >
                    <IonIcon icon={close} />
                  </IonButton>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        ))}
      </div>

      {/* Notification Center Toggle */}
      {notifications.length > 0 && (
        <div className="notification-center-toggle">
          <IonButton
            fill="solid"
            size="small"
            color="primary"
            onClick={() => setShowCenter(!showCenter)}
          >
            <IonIcon icon={notificationsOutline} />
            {notifications.length > 0 && (
              <IonBadge color="danger" className="notification-badge">
                {notifications.length}
              </IonBadge>
            )}
          </IonButton>
        </div>
      )}

      {/* Notification Center Modal */}
      {showCenter && (
        <div className="notification-center-overlay" onClick={() => setShowCenter(false)}>
          <div className="notification-center" onClick={(e) => e.stopPropagation()}>
            <div className="notification-center-header">
              <h3>Notifications</h3>
              <div className="notification-center-actions">
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                >
                  Clear All
                </IonButton>
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setShowCenter(false)}
                >
                  <IonIcon icon={close} />
                </IonButton>
              </div>
            </div>
            
            <div className="notification-center-content">
              {notifications.length === 0 ? (
                <div className="notification-center-empty">
                  <IonIcon icon={notificationsOutline} size="large" color="medium" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-center-item notification-${notification.type}`}
                  >
                    <div className="notification-center-icon">
                      <IonIcon
                        icon={getNotificationIcon(notification)}
                        color={notification.color}
                      />
                    </div>
                    <div className="notification-center-text">
                      <div className="notification-center-title">
                        {notification.title}
                      </div>
                      <div className="notification-center-message">
                        {notification.message}
                      </div>
                      <div className="notification-center-time">
                        {formatTimeAgo(notification.timestamp)}
                      </div>
                    </div>
                    <div className="notification-center-actions">
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => handleDismiss(notification.id)}
                      >
                        <IonIcon icon={close} />
                      </IonButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCenter;
