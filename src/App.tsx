import { useEffect, useState } from 'react';
import { User, Message } from './types';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ActiveChat from './components/ActiveChat';
import { MessageSquareDashed, MessageSquare, Users, Settings, Shield, Database, LogOut, Cpu } from 'lucide-react';
import {
  saveUserProfile,
  listenUsers,
  sendMessage,
  listenMessages,
  listenUnreadCounts,
  markMessagesAsRead,
  setTypingState,
  listenTypingState
} from './lib/firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('web_messenger_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingContacts, setTypingContacts] = useState<{ [userId: string]: boolean }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [userId: string]: number }>({});

  // Synchronize user presence & active user profile to Firestore
  useEffect(() => {
    if (!currentUser) return;

    // Set online status to true
    saveUserProfile(currentUser, true);

    const handleBeforeUnload = () => {
      saveUserProfile(currentUser, false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        saveUserProfile(currentUser, true);
      } else {
        saveUserProfile(currentUser, false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveUserProfile(currentUser, false);
    };
  }, [currentUser]);

  // Real-time listener for users
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = listenUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for unread messages counts
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = listenUnreadCounts(currentUser.id, (counts) => {
      setUnreadCounts(counts);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for chat messages
  useEffect(() => {
    if (!currentUser || !selectedContactId) {
      setMessages([]);
      return;
    }

    // Mark messages from this contact as read immediately
    markMessagesAsRead(selectedContactId, currentUser.id);

    const unsubscribe = listenMessages(currentUser.id, selectedContactId, (history) => {
      setMessages(history);
    });

    return () => unsubscribe();
  }, [currentUser, selectedContactId]);

  // Real-time listener for contact typing indicators
  useEffect(() => {
    if (!currentUser || !selectedContactId) return;

    const unsubscribe = listenTypingState(selectedContactId, currentUser.id, (isTyping) => {
      setTypingContacts((prev) => ({
        ...prev,
        [selectedContactId]: isTyping,
      }));
    });

    return () => unsubscribe();
  }, [currentUser, selectedContactId]);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('web_messenger_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    if (currentUser) {
      await saveUserProfile(currentUser, false);
    }
    localStorage.removeItem('web_messenger_user');
    setCurrentUser(null);
    setSelectedContactId(null);
    setUsers([]);
    setMessages([]);
    setUnreadCounts({});
    setTypingContacts({});
  };

  const handleSendMessage = (text: string) => {
    if (!selectedContactId || !currentUser) return;
    sendMessage(currentUser.id, selectedContactId, text);
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (!selectedContactId || !currentUser) return;
    setTypingState(currentUser.id, selectedContactId, isTyping);
  };

  // Switch contact safely
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
  };

  // Get active selected user profile object
  const activeContact = users.find((u) => u.id === selectedContactId);

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-root" className="flex h-screen bg-[#0A0A0B] font-sans antialiased text-zinc-300 overflow-hidden select-none">
      {/* 1. Navigation Rail (leftmost panel) */}
      <nav id="nav-rail" className="w-16 flex flex-col items-center py-6 bg-[#0E0E10] border-r border-zinc-800/50 space-y-8 shrink-0">
        {/* Logo / Badge */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
          M
        </div>

        {/* View Selection Toggles */}
        <div className="flex flex-col space-y-6 flex-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-blue-500 bg-blue-500/10 cursor-pointer" title="Direct Messages">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 cursor-not-allowed" title="Channels (Coming Soon)">
            <Users className="w-5 h-5" />
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 cursor-not-allowed" title="Settings (Coming Soon)">
            <Settings className="w-5 h-5" />
          </div>
        </div>

        {/* Bottom User Actions & Avatar */}
        <div className="flex flex-col items-center space-y-4">
          <button
            id="logout-btn"
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            title={`${currentUser.name} (${currentUser.email})`}
            className="w-8 h-8 rounded-full border border-zinc-800 object-cover bg-zinc-900"
          />
        </div>
      </nav>

      {/* 2. Chat Sidebar directory */}
      <Sidebar
        currentUser={currentUser}
        users={users}
        selectedContactId={selectedContactId}
        onSelectContact={handleSelectContact}
        onLogout={handleLogout}
        typingContacts={typingContacts}
        unreadCounts={unreadCounts}
      />

      {/* 3. Main chat view with dynamic multi-pane sidebar wrapper */}
      <div className="flex-1 flex h-full overflow-hidden">
        {activeContact ? (
          <>
            {/* Center Chat Viewport */}
            <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-zinc-800/50">
              <ActiveChat
                currentUser={currentUser}
                contact={activeContact}
                messages={messages}
                onSendMessage={handleSendMessage}
                onSendTyping={handleSendTyping}
                isContactTyping={!!typingContacts[selectedContactId]}
              />
            </div>

            {/* 4. Right Information Sidebar matching the template */}
            <aside id="right-sidebar" className="w-64 bg-[#0E0E10]/40 p-6 flex flex-col space-y-8 h-full overflow-y-auto shrink-0">
              {/* Security & Encryption widget */}
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-4">Conversation Security</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/40 rounded-xl space-y-1">
                    <div className="text-[10px] text-zinc-500 font-medium">Encryption Standard</div>
                    <div className="text-xs text-zinc-200 font-semibold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      AES-256 E2E Verified
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/40 rounded-xl space-y-1">
                    <div className="text-[10px] text-zinc-500 font-medium">Retention Policy</div>
                    <div className="text-xs text-zinc-200 font-semibold flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-blue-500" />
                      30 Days (Local Storage)
                    </div>
                  </div>
                </div>
              </div>

              {/* Cluster Nodes monitoring widget */}
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-4">Active Sync Nodes</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-900 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-zinc-400 font-medium">us-east-4a</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">Primary</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-900 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60"></span>
                      <span className="text-zinc-400 font-medium">eu-west-1c</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">Standby</span>
                  </div>
                </div>
              </div>

              {/* Verification & Tech info block */}
              <div className="mt-auto p-4 bg-zinc-900/20 border border-zinc-800/20 rounded-xl text-center">
                <div className="inline-flex p-2 bg-blue-500/5 rounded-lg text-blue-500 mb-2">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-zinc-300">System Integrity</div>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  All synchronization nodes are operating at normal capacity.
                </p>
              </div>
            </aside>
          </>
        ) : (
          <div id="no-chat-screen" className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0A0A0B]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-2xl animate-pulse"></div>
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800/60 rounded-2xl flex items-center justify-center text-zinc-500 relative z-10 shadow-lg">
                <MessageSquareDashed className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-base font-bold text-zinc-200">No active chat selected</h3>
            <p className="text-xs text-zinc-500 text-center max-w-sm mt-2 leading-relaxed font-medium">
              Select a team member from the sidebar directory on the left to start instant real-time messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
