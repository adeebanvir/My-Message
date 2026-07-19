import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { User, Message } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with custom database ID from config if present
export const db = initializeFirestore(
  app,
  {},
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export const auth = getAuth(app);

// ---------------------------------------------------------
// Mandatory Firestore Error Handling (Section 3 of SKILL.md)
// ---------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Derives a deterministic chat ID from two user IDs.
 */
export const getChatId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Saves or updates a user's profile in the /users collection.
 */
export const saveUserProfile = async (user: User, online: boolean) => {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      online,
      lastSeen: Date.now(),
      description: user.description || '',
      addedContactIds: user.addedContactIds || []
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Retrieves a user profile by 12-digit ID.
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

/**
 * Adds a contact to user's friend/contact list.
 */
export const addContactToUser = async (currentUserId: string, contactId: string): Promise<void> => {
  const path = `users/${currentUserId}`;
  try {
    const userRef = doc(db, 'users', currentUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const currentContacts = userData.addedContactIds || [];
      if (!currentContacts.includes(contactId)) {
        const updatedContacts = [...currentContacts, contactId];
        await updateDoc(userRef, { addedContactIds: updatedContacts });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Listens to all inbound messages where the recipient is currentUserId.
 * This is used to automatically discover users who sent messages to us.
 */
export const listenInboxMessages = (currentUserId: string, callback: (messages: Message[]) => void) => {
  const path = `messages?recipientId=${currentUserId}`;
  const messagesCol = collection(db, 'messages');
  const q = query(
    messagesCol,
    where('recipientId', '==', currentUserId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data() as Message);
      });
      callback(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

/**
 * Listens to all registered users in real-time.
 */
export const listenUsers = (callback: (users: User[]) => void) => {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      callback(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

/**
 * Sends a message in real-time.
 */
export const sendMessage = async (senderId: string, recipientId: string, text: string) => {
  const path = 'messages';
  const chatId = getChatId(senderId, recipientId);
  const messageData = {
    senderId,
    recipientId,
    chatId,
    text,
    timestamp: Date.now(), // client-side fallback/timestamp for reliable sorting
    serverTime: serverTimestamp(),
    status: 'sent',
    type: 'text'
  };

  try {
    const messagesCol = collection(db, 'messages');
    const docRef = await addDoc(messagesCol, messageData);
    // Update with generated ID
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
};

/**
 * Listens to real-time chat history between two users.
 */
export const listenMessages = (uid1: string, uid2: string, callback: (messages: Message[]) => void) => {
  const chatId = getChatId(uid1, uid2);
  const path = `messages?chatId=${chatId}`;
  const messagesCol = collection(db, 'messages');
  const q = query(
    messagesCol,
    where('chatId', '==', chatId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data() as Message);
      });
      // Sort client-side by timestamp to avoid composite index requirements
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

/**
 * Listens to unread message counts for all users destined for currentUserId.
 */
export const listenUnreadCounts = (currentUserId: string, callback: (counts: { [userId: string]: number }) => void) => {
  const path = `messages?recipientId=${currentUserId}`;
  const messagesCol = collection(db, 'messages');
  const q = query(
    messagesCol,
    where('recipientId', '==', currentUserId),
    where('status', '!=', 'read')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const counts: { [userId: string]: number } = {};
      snapshot.forEach((doc) => {
        const msg = doc.data();
        const senderId = msg.senderId;
        counts[senderId] = (counts[senderId] || 0) + 1;
      });
      callback(counts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

/**
 * Marks all unread messages from a contact as read.
 */
export const markMessagesAsRead = async (senderId: string, recipientId: string) => {
  const path = `messages?senderId=${senderId}&recipientId=${recipientId}`;
  const messagesCol = collection(db, 'messages');
  const q = query(
    messagesCol,
    where('senderId', '==', senderId),
    where('recipientId', '==', recipientId),
    where('status', '!=', 'read')
  );

  try {
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let updated = false;
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { status: 'read' });
      updated = true;
    });

    if (updated) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Sets typing status for the current user.
 */
export const setTypingState = async (userId: string, recipientId: string, isTyping: boolean) => {
  const path = `typing/${userId}`;
  try {
    const typingRef = doc(db, 'typing', userId);
    await setDoc(typingRef, {
      recipientId,
      isTyping,
      timestamp: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Listens to a contact's typing status destined for the current user.
 */
export const listenTypingState = (contactId: string, currentUserId: string, callback: (isTyping: boolean) => void) => {
  const path = `typing/${contactId}`;
  const typingRef = doc(db, 'typing', contactId);
  return onSnapshot(
    typingRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isRecent = Date.now() - data.timestamp < 4000; // auto-expire older typing indications
        if (data.recipientId === currentUserId && isRecent) {
          callback(data.isTyping);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};
