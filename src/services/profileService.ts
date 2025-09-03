/**
 * Profile Service
 * Handles user profile operations
 */

import { authApi } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ProfileUpdateData {
  displayName?: string;
  bio?: string;
  location?: string;
  favoriteSpecies?: string;
  isPublicProfile?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export interface ProfileResponse {
  message: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    email: string;
    bio: string | null;
    location: string | null;
    favorite_species: string | null;
    is_public_profile: boolean;
    email_notifications: boolean;
    push_notifications: boolean;
    updated_at: string;
  };
}

/**
 * Update user profile
 */
export const updateUserProfile = async (
  token: string,
  profileData: ProfileUpdateData
): Promise<ProfileResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    return data;
  } catch (error: any) {
    console.error('Profile update failed:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
};

/**
 * Get current user profile
 */
export const getCurrentUserProfile = async () => {
  try {
    const response = await authApi.getProfile();
    return response.data;
  } catch (error: any) {
    console.error('Get profile failed:', error);
    throw new Error(error.message || 'Failed to get profile');
  }
};

/**
 * Get public user profile by ID
 */
export const getPublicUserProfile = async (userId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/public`, {
      method: 'GET'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get public profile');
    }

    return data;
  } catch (error: any) {
    console.error('Get public profile failed:', error);
    throw new Error(error.message || 'Failed to get public profile');
  }
};
