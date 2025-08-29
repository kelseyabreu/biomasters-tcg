/**
 * Avatar Component
 * Displays user avatars with fallbacks and visual indicators for account status
 */

import React from 'react';
import {
  IonAvatar,
  IonIcon,
  IonBadge
} from '@ionic/react';
import {
  person,
  shield,
  star,
  checkmarkCircle
} from 'ionicons/icons';
import './Avatar.css';

export type AccountType = 'guest' | 'registered' | 'premium' | 'none';
export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  src?: string | null;
  accountType?: AccountType;
  username?: string;
  size?: AvatarSize;
  showStatusBadge?: boolean;
  showAccountTypeBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  accountType = 'none',
  username,
  size = 'medium',
  showStatusBadge = false,
  showAccountTypeBadge = false,
  className = '',
  onClick
}) => {
  // Generate initials from username
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    
    const words = name.split(' ').filter(word => word.length > 0);
    if (words.length === 0) return '?';
    
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Get avatar background color based on account type
  const getAvatarClass = (): string => {
    const baseClass = `avatar-${size}`;
    const typeClass = `avatar-${accountType}`;
    return `${baseClass} ${typeClass} ${className}`;
  };

  // Get status badge configuration
  const getStatusBadge = () => {
    switch (accountType) {
      case 'registered':
        return {
          icon: checkmarkCircle,
          color: 'success',
          title: 'Verified Account'
        };
      case 'premium':
        return {
          icon: star,
          color: 'warning',
          title: 'Premium Account'
        };
      case 'guest':
        return {
          icon: shield,
          color: 'medium',
          title: 'Guest Account'
        };
      default:
        return null;
    }
  };

  // Get account type badge configuration
  const getAccountTypeBadge = () => {
    switch (accountType) {
      case 'registered':
        return {
          text: 'REG',
          color: 'success'
        };
      case 'premium':
        return {
          text: 'PRO',
          color: 'warning'
        };
      case 'guest':
        return {
          text: 'GUEST',
          color: 'medium'
        };
      default:
        return null;
    }
  };

  const statusBadge = getStatusBadge();
  const accountTypeBadge = getAccountTypeBadge();

  return (
    <div className={`avatar-container ${getAvatarClass()}`} onClick={onClick}>
      <IonAvatar className="avatar-element">
        {src ? (
          <img 
            src={src} 
            alt={`${username || 'User'} avatar`}
            onError={(e) => {
              // Fallback to default avatar if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className={`default-avatar avatar-${accountType}`}>
            {username ? getInitials(username) : <IonIcon icon={person} />}
          </div>
        )}
      </IonAvatar>

      {/* Status Badge */}
      {showStatusBadge && statusBadge && (
        <IonBadge 
          className="status-badge"
          color={statusBadge.color}
          title={statusBadge.title}
        >
          <IonIcon icon={statusBadge.icon} />
        </IonBadge>
      )}

      {/* Account Type Badge */}
      {showAccountTypeBadge && accountTypeBadge && (
        <IonBadge 
          className="account-type-badge"
          color={accountTypeBadge.color}
        >
          {accountTypeBadge.text}
        </IonBadge>
      )}
    </div>
  );
};

/**
 * Avatar Group Component
 * Displays multiple avatars in a group (useful for multiplayer games, teams, etc.)
 */
interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null;
    accountType?: AccountType;
    username?: string;
    id: string;
  }>;
  size?: AvatarSize;
  maxVisible?: number;
  showStatusBadges?: boolean;
  className?: string;
  onAvatarClick?: (id: string) => void;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  size = 'medium',
  maxVisible = 3,
  showStatusBadges = false,
  className = '',
  onAvatarClick
}) => {
  const visibleAvatars = avatars.slice(0, maxVisible);
  const remainingCount = Math.max(0, avatars.length - maxVisible);

  return (
    <div className={`avatar-group ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <div 
          key={avatar.id}
          className="avatar-group-item"
          style={{ zIndex: visibleAvatars.length - index }}
        >
          <Avatar
            src={avatar.src}
            accountType={avatar.accountType}
            username={avatar.username}
            size={size}
            showStatusBadge={showStatusBadges}
            onClick={() => onAvatarClick?.(avatar.id)}
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="avatar-group-item avatar-overflow">
          <IonAvatar className={`avatar-element avatar-${size}`}>
            <div className="default-avatar avatar-overflow">
              +{remainingCount}
            </div>
          </IonAvatar>
        </div>
      )}
    </div>
  );
};

/**
 * Avatar Placeholder Component
 * Shows a loading or empty state avatar
 */
interface AvatarPlaceholderProps {
  size?: AvatarSize;
  isLoading?: boolean;
  className?: string;
}

export const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({
  size = 'medium',
  isLoading = false,
  className = ''
}) => {
  return (
    <div className={`avatar-container avatar-${size} ${className}`}>
      <IonAvatar className="avatar-element">
        <div className={`default-avatar avatar-placeholder ${isLoading ? 'loading' : ''}`}>
          <IonIcon icon={person} />
        </div>
      </IonAvatar>
    </div>
  );
};
