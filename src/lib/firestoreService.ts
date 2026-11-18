import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  ActivityLogRecord,
  BookingRecord,
  PlaceCategory,
  PromotionRecord,
  SearchHistoryRecord,
  UserProfile,
} from '../types/app';
import { ADMIN_BOOTSTRAP_EMAIL, FIELD_LIMITS, generateSafeId, sanitizeStr } from './constants';
import { db, handleFirestoreError, OperationType } from './firebase';

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userPath = 'users';
  const ref = doc(db, userPath, user.uid);
  const isBootstrapAdmin = user.email === ADMIN_BOOTSTRAP_EMAIL && user.emailVerified;

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      if (user.emailVerified) {
        await updateDoc(ref, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return existing;
    }

    const profile: UserProfile = {
      uid: user.uid,
      email: sanitizeStr(user.email || `${user.uid}@user.local`, FIELD_LIMITS.emailMax),
      displayName: sanitizeStr(user.displayName || user.email?.split('@')[0] || 'Guest Explorer', FIELD_LIMITS.displayNameMax),
      ...(user.photoURL ? { photoURL: sanitizeStr(user.photoURL, 1024) } : {}),
      role: isBootstrapAdmin ? 'admin' : 'user',
      status: 'active',
      notificationsEnabled: true,
      promoAlertsEnabled: true,
      preferredCategory: 'all',
      searchRadiusMeters: 5000,
    };

    if (user.emailVerified) {
      await setDoc(ref, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    }
    return profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${userPath}/${user.uid}`);
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: Partial<
    Pick<
      UserProfile,
      'displayName' | 'phone' | 'notificationsEnabled' | 'promoAlertsEnabled' | 'preferredCategory' | 'searchRadiusMeters'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.displayName !== undefined) {
      payload.displayName = sanitizeStr(updates.displayName, FIELD_LIMITS.displayNameMax) || 'Explorer';
    }
    if (updates.phone !== undefined) {
      payload.phone = sanitizeStr(updates.phone, FIELD_LIMITS.phoneMax);
    }
    if (updates.notificationsEnabled !== undefined) {
      payload.notificationsEnabled = Boolean(updates.notificationsEnabled);
    }
    if (updates.promoAlertsEnabled !== undefined) {
      payload.promoAlertsEnabled = Boolean(updates.promoAlertsEnabled);
    }
    if (updates.preferredCategory !== undefined) {
      payload.preferredCategory = updates.preferredCategory;
    }
    if (updates.searchRadiusMeters !== undefined) {
      payload.searchRadiusMeters = Math.min(Math.max(updates.searchRadiusMeters, 500), 50000);
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function logActivity(params: {
  user: User;
  action: string;
  details: string;
  category: ActivityLogRecord['category'];
}): Promise<void> {
  if (!params.user.emailVerified) return;
  const id = generateSafeId('log');
  const path = `activityLogs/${id}`;
  try {
    await setDoc(doc(db, 'activityLogs', id), {
      id,
      userId: params.user.uid,
      userEmail: sanitizeStr(params.user.email || `${params.user.uid}@user.local`, FIELD_LIMITS.emailMax),
      action: sanitizeStr(params.action, FIELD_LIMITS.actionMax),
      details: sanitizeStr(params.details, FIELD_LIMITS.detailsMax),
      category: params.category,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking audit logging; report cleanly in console via structured helper
    console.warn('Activity log write skipped:', err instanceof Error ? err.message : String(err));
  }
}

export async function createBookingRecord(
  user: User,
  input: Omit<BookingRecord, 'id' | 'userId' | 'userEmail' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateSafeId('bkg');
  const path = `bookings/${id}`;
  try {
    await setDoc(doc(db, 'bookings', id), {
      id,
      userId: user.uid,
      userEmail: sanitizeStr(user.email || `${user.uid}@user.local`, FIELD_LIMITS.emailMax),
      userName: sanitizeStr(input.userName || user.displayName || 'Guest', FIELD_LIMITS.displayNameMax),
      placeId: sanitizeStr(input.placeId, 256),
      placeName: sanitizeStr(input.placeName, FIELD_LIMITS.placeNameMax),
      placeAddress: sanitizeStr(input.placeAddress, FIELD_LIMITS.placeAddressMax),
      ...(input.placePhone ? { placePhone: sanitizeStr(input.placePhone, 64) } : {}),
      category: input.category,
      checkInDate: sanitizeStr(input.checkInDate, 32),
      ...(input.checkOutDate ? { checkOutDate: sanitizeStr(input.checkOutDate, 32) } : {}),
      ...(input.timeSlot ? { timeSlot: sanitizeStr(input.timeSlot, 32) } : {}),
      guests: Math.min(Math.max(Math.round(input.guests), 1), 50),
      roomOrServiceType: sanitizeStr(input.roomOrServiceType, FIELD_LIMITS.roomTypeMax),
      ...(typeof input.totalAmount === 'number' ? { totalAmount: Math.max(0, input.totalAmount) } : {}),
      ...(input.currency ? { currency: sanitizeStr(input.currency, 10) } : {}),
      paymentMethod: input.paymentMethod,
      bookingSource: input.bookingSource,
      status: input.status,
      ...(input.notes ? { notes: sanitizeStr(input.notes, FIELD_LIMITS.notesMax) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function cancelBookingRecord(bookingId: string, notes?: string): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled',
      ...(notes ? { notes: sanitizeStr(notes, FIELD_LIMITS.notesMax) } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeUserBookings(
  uid: string,
  onData: (items: BookingRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, 'bookings'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as BookingRecord));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    }
  );
}

export async function saveSearchHistoryRecord(
  user: User,
  entry: {
    query: string;
    locationLabel: string;
    lat: number;
    lng: number;
    category: PlaceCategory;
    mode: 'gps' | 'manual';
    resultCount: number;
  }
): Promise<void> {
  if (!user.emailVerified) return;
  const id = generateSafeId('srch');
  const path = `searchHistory/${id}`;
  try {
    await setDoc(doc(db, 'searchHistory', id), {
      id,
      userId: user.uid,
      query: sanitizeStr(entry.query, FIELD_LIMITS.queryMax),
      locationLabel: sanitizeStr(entry.locationLabel, FIELD_LIMITS.locationLabelMax) || 'Nearby Area',
      lat: Math.min(Math.max(entry.lat, -90), 90),
      lng: Math.min(Math.max(entry.lng, -180), 180),
      category: entry.category,
      mode: entry.mode,
      resultCount: Math.min(Math.max(Math.round(entry.resultCount), 0), 100),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Search history save skipped:', err instanceof Error ? err.message : String(err));
  }
}

export function subscribeSearchHistory(
  uid: string,
  onData: (items: SearchHistoryRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'searchHistory'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as SearchHistoryRecord));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'searchHistory');
    }
  );
}

export async function deleteSearchHistoryRecord(historyId: string): Promise<void> {
  const path = `searchHistory/${historyId}`;
  try {
    await deleteDoc(doc(db, 'searchHistory', historyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeActivePromotions(onData: (items: PromotionRecord[]) => void): Unsubscribe {
  const q = query(collection(db, 'promotions'), where('active', '==', true), limit(20));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as PromotionRecord));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'promotions');
    }
  );
}

// Admin operations
export function subscribeAllUsersAdmin(onData: (items: UserProfile[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as UserProfile));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

export async function updateUserRoleOrStatusAdmin(
  targetUser: UserProfile,
  updates: { role?: 'user' | 'admin'; status?: 'active' | 'suspended' }
): Promise<void> {
  const path = `users/${targetUser.uid}`;
  try {
    await updateDoc(doc(db, 'users', targetUser.uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    if (updates.role === 'admin') {
      await setDoc(doc(db, 'admins', targetUser.uid), {
        uid: targetUser.uid,
        email: targetUser.email,
        grantedAt: serverTimestamp(),
      });
    } else if (updates.role === 'user') {
      await deleteDoc(doc(db, 'admins', targetUser.uid)).catch(() => undefined);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeAllBookingsAdmin(onData: (items: BookingRecord[]) => void): Unsubscribe {
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as BookingRecord));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    }
  );
}

export async function updateBookingStatusAdmin(
  bookingId: string,
  status: BookingRecord['status']
): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeActivityLogsAdmin(onData: (items: ActivityLogRecord[]) => void): Unsubscribe {
  const q = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as ActivityLogRecord));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activityLogs');
    }
  );
}

export async function createPromotionAdmin(
  adminUid: string,
  promo: Omit<PromotionRecord, 'id' | 'createdBy' | 'createdAt'>
): Promise<void> {
  const id = generateSafeId('promo');
  const path = `promotions/${id}`;
  try {
    await setDoc(doc(db, 'promotions', id), {
      id,
      title: sanitizeStr(promo.title, 140),
      description: sanitizeStr(promo.description, 400),
      category: promo.category,
      discountLabel: sanitizeStr(promo.discountLabel, 40),
      validUntil: sanitizeStr(promo.validUntil, 32),
      active: promo.active,
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fetchAllPromotionsAdmin(): Promise<PromotionRecord[]> {
  try {
    const snap = await getDocs(query(collection(db, 'promotions'), orderBy('createdAt', 'desc'), limit(50)));
    return snap.docs.map((d) => d.data() as PromotionRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'promotions');
  }
}

export async function togglePromotionAdmin(promoId: string, active: boolean): Promise<void> {
  const path = `promotions/${promoId}`;
  try {
    await updateDoc(doc(db, 'promotions', promoId), { active });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
