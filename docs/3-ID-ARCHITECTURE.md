# 3-ID Architecture for BioMasters TCG

## Overview

The BioMasters TCG uses a **3-ID architecture** to support all user types (Anonymous, Guest, Registered, Admin) with a single, consistent storage strategy. This eliminates the need for fallback logic and user ID confusion.

## The Three IDs

Every `OfflineCollection` has three ID fields:

```typescript
export interface OfflineCollection {
  client_user_id: string;           // Device-generated UUID (stable across guest→registered)
  firebase_user_id: string | null;  // Firebase UID (null for anonymous/guest)
  db_user_id: string | null;        // Server-assigned UUID (null until first sync)
  device_id: string;
  // ... other fields
}
```

### 1. `client_user_id` (Client User ID)
- **Generated**: On device, first app launch
- **Format**: UUID v4 (e.g., `66e2a2f1-e2ed-4282-9bdb-807a04d9be7b`)
- **Stability**: Never changes, even when upgrading from guest to registered
- **Purpose**: Stable identifier for offline-first functionality

### 2. `firebase_user_id` (Firebase User ID)
- **Generated**: By Firebase Auth when user registers/signs in
- **Format**: Firebase UID (e.g., `fFsRN2YLlwR4s6ws1Zfz6UBsDYx2`)
- **Stability**: Never changes once assigned
- **Purpose**: Authentication and cross-platform sync

### 3. `db_user_id` (Database User ID)
- **Generated**: By server when guest registers or user creates account
- **Format**: UUID v4 (e.g., `721eab5a-9239-4f66-b974-df7df6564b62`)
- **Stability**: Never changes once assigned
- **Purpose**: Server-side database relationships

## User Types and Their IDs

### Anonymous User (`UserType.ANONYMOUS`)
```typescript
{
  client_user_id: "66e2a2f1-...",  // ✅ Generated on device
  firebase_user_id: null,           // ❌ Not authenticated
  db_user_id: null,                 // ❌ Not registered with server
  device_id: "mg8bxqf3-..."
}
```

**Storage Key**: `client_user_id`

### Guest User (`UserType.GUEST`)
```typescript
{
  client_user_id: "66e2a2f1-...",  // ✅ Same as before
  firebase_user_id: null,           // ❌ Not Firebase authenticated
  db_user_id: "721eab5a-...",       // ✅ Assigned by server
  device_id: "mg8bxqf3-..."
}
```

**Storage Key**: `db_user_id` (more stable than client_user_id)

### Registered User (`UserType.REGISTERED`)
```typescript
{
  client_user_id: "66e2a2f1-...",  // ✅ Same as before
  firebase_user_id: "fFsRN2YLlw...", // ✅ Firebase UID
  db_user_id: "721eab5a-...",       // ✅ Same as before
  device_id: "mg8bxqf3-..."
}
```

**Storage Key**: `firebase_user_id` (most stable, never changes)

### Admin User (`UserType.ADMIN`)
Same as Registered + `isAdmin` flag

**Storage Key**: `firebase_user_id`

## Deterministic Storage Key Strategy

The storage key is determined automatically using a **priority-based fallback**:

```typescript
function getStorageKey(collection: OfflineCollection): string {
  // Priority: firebase_user_id > db_user_id > client_user_id
  return collection.firebase_user_id || collection.db_user_id || collection.client_user_id;
}
```

### Why This Works

1. **Anonymous**: Uses `client_user_id` (only ID available)
2. **Guest**: Uses `db_user_id` (server-assigned, more stable)
3. **Registered**: Uses `firebase_user_id` (most stable, never changes)
4. **Account Upgrades**: When guest→registered, `firebase_user_id` becomes available, storage key changes, but we migrate the collection
5. **Sign Out/Switch Accounts**: Each user type has a stable key that doesn't change

### Benefits

✅ **No Fallback Logic**: Storage key is deterministic and predictable  
✅ **No User ID Confusion**: Each ID has a clear purpose  
✅ **Stable Across Upgrades**: `client_user_id` persists through guest→registered  
✅ **Cross-Platform Sync**: `firebase_user_id` enables seamless sync  
✅ **Server Relationships**: `db_user_id` maintains database integrity  

## Implementation

### Creating a Collection

```typescript
// Old way (WRONG):
const collection = offlineSecurityService.createInitialCollection(userId);

// New way (CORRECT):
const clientUserId = state.identity.clientUserId;
const firebaseUserId = state.firebaseUser?.uid || null;
const dbUserId = state.identity.dbUserId || null;

const collection = offlineSecurityService.createInitialCollection(
  clientUserId,
  firebaseUserId,
  dbUserId
);
```

### Saving a Collection

```typescript
// Old way (WRONG):
offlineSecurityService.saveOfflineCollection(collection, userId);

// New way (CORRECT):
offlineSecurityService.saveOfflineCollection(collection);
// Storage key is determined automatically from the collection's 3 IDs
```

### Loading a Collection

```typescript
// The storage key is determined automatically
const collection = await offlineSecurityService.loadOfflineCollection();
```

## Migration from Old Format

Old collections had a single `user_id` field that could be any of the 3 IDs. The migration code:

1. Reads the old collection
2. Determines the current 3 IDs from app state
3. Creates a new collection with all 3 IDs populated
4. Saves with the new deterministic storage key

```typescript
// Migration example
const oldUserId = oldCollection.user_id; // Could be any of the 3 IDs
const clientUserId = state.identity.clientUserId;
const firebaseUserId = state.firebaseUser?.uid || null;
const dbUserId = state.identity.dbUserId || null;

const migratedCollection = {
  client_user_id: clientUserId,
  firebase_user_id: firebaseUserId,
  db_user_id: dbUserId,
  // ... rest of the collection
};
```

## Hash Calculation

The collection hash now includes all 3 IDs for integrity:

```typescript
calculateCollectionHash(collection: Omit<OfflineCollection, 'collection_hash'>): string {
  const hashData = {
    client_user_id: collection.client_user_id,
    firebase_user_id: collection.firebase_user_id,
    db_user_id: collection.db_user_id,
    device_id: collection.device_id,
    cards_owned: collection.cards_owned,
    eco_credits: collection.eco_credits,
    xp_points: collection.xp_points,
    last_sync: collection.last_sync,
    signing_key_version: collection.signing_key_version
  };

  return CryptoJS.SHA256(JSON.stringify(hashData)).toString();
}
```

## Account Lifecycle Examples

### Example 1: Anonymous → Guest → Registered

1. **Anonymous** (first launch):
   ```
   client_user_id: "abc123"
   firebase_user_id: null
   db_user_id: null
   Storage Key: "abc123"
   ```

2. **Guest** (after server registration):
   ```
   client_user_id: "abc123"  (same)
   firebase_user_id: null
   db_user_id: "def456"  (new)
   Storage Key: "def456"  (changed, migrate collection)
   ```

3. **Registered** (after Firebase sign-in):
   ```
   client_user_id: "abc123"  (same)
   firebase_user_id: "ghi789"  (new)
   db_user_id: "def456"  (same)
   Storage Key: "ghi789"  (changed, migrate collection)
   ```

### Example 2: Sign Out and Sign In as Different User

1. **User A** (registered):
   ```
   Storage Key: "firebase_uid_A"
   ```

2. **Sign Out**: Collection remains in storage with key `"firebase_uid_A"`

3. **User B** (registered):
   ```
   Storage Key: "firebase_uid_B"
   ```

4. **Result**: Each user has their own collection, no conflicts

## Testing

To test the 3-ID architecture:

1. **Clear all data**: localStorage + IndexedDB
2. **Start as anonymous**: Check `client_user_id` is generated
3. **Register as guest**: Check `db_user_id` is assigned
4. **Sign in with Firebase**: Check `firebase_user_id` is assigned
5. **Verify storage key**: Should be `firebase_user_id`
6. **Sign out and sign in as different user**: Verify separate collections

## Troubleshooting

### Issue: Collection not found after sign-in
**Cause**: Storage key mismatch  
**Solution**: Check that all 3 IDs are correctly populated in the collection

### Issue: Collection shows wrong data
**Cause**: Using wrong storage key  
**Solution**: Verify `getStorageKey()` is using the correct priority

### Issue: Data lost after account upgrade
**Cause**: Migration not working  
**Solution**: Check migration code is properly copying all fields and using new 3-ID format

## Summary

The 3-ID architecture provides:
- ✅ **Clarity**: Each ID has a specific purpose
- ✅ **Stability**: IDs don't change unexpectedly
- ✅ **Simplicity**: No complex fallback logic
- ✅ **Scalability**: Supports all user types with one pattern
- ✅ **Reliability**: Deterministic storage keys prevent conflicts

