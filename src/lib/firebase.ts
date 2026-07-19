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
  const userRef = doc(db, 'users', user.id);
  await setDoc(userRef, {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    online,
    lastSeen: Date.now()
  }, { merge: true });
};

/**
 * Listens to all registered users in real-time.
 */
export const listenUsers = (callback: (users: User[]) => void) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    callback(users);
  });
};

/**
 * Sends a message in real-time.
 */
export const sendMessage = async (senderId: string, recipientId: string, text: string) => {
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

  const messagesCol = collection(db, 'messages');
  const docRef = await addDoc(messagesCol, messageData);
  // Update with generated ID
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

/**
 * Listens to real-time chat history between two users.
 */
export const listenMessages = (uid1: string, uid2: string, callback: (messages: Message[]) => void) => {
  const chatId = getChatId(uid1, uid2);
  const messagesCol = collection(db, 'messages');
  const q = query(
    messagesCol,
    where('chatId', '==', chatId)
  );

  return onSnapshot(q, (snapshot) => {
    const msgs: Message[] = [];
    snapshot.forEach((doc) => {
      msgs.push(doc.data() as Message);
    });
    // Sort client-side by timestamp to avoid composite index requirements
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    callback(msgs);
  });
};

/**
 * Listens to unread message counts for all users destined for currentUserId.
 */
export const listenUnreadCounts = (currentUserId: string, callback: (counts: { [userId: string]: number }) => void) => {
  const messagesCol = collection(db, 'messages');
  const q = query(
    messagesCol,
    where('recipientId', '==', currentUserId),
    where('status', '!=', 'read')
  );

  return onSnapshot(q, (snapshot) => {
    const counts: { [userId: string]: number } = {};
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const senderId = msg.senderId;
      counts[senderId] = (counts[senderId] || 0) + 1;
    });
    callback(counts);
  });
};

/**
 * Marks all unread messages from a contact as read.
 */
export const markMessagesAsRead = async (senderId: string, recipientId: string) => {
  const messagesCol = collection(db, 'messages');
  const q = query(
    messagesCol,
    where('senderId', '==', senderId),
    where('recipientId', '==', recipientId),
    where('status', '!=', 'read')
  );

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
};

/**
 * Sets typing status for the current user.
 */
export const setTypingState = async (userId: string, recipientId: string, isTyping: boolean) => {
  const typingRef = doc(db, 'typing', userId);
  await setDoc(typingRef, {
    recipientId,
    isTyping,
    timestamp: Date.now()
  });
};

/**
 * Listens to a contact's typing status destined for the current user.
 */
export const listenTypingState = (contactId: string, currentUserId: string, callback: (isTyping: boolean) => void) => {
  const typingRef = doc(db, 'typing', contactId);
  return onSnapshot(typingRef, (docSnap) => {
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
  });
};
