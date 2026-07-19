import { useEffect, useState } from 'react';
import { User, Message } from './types';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ActiveChat from './components/ActiveChat';
import { MessageSquareDashed, MessageSquare, Users, Settings, Shield, Database, LogOut, Cpu, Activity, Copy, Check, Info } from 'lucide-react';
import {
  saveUserProfile,
  listenUsers,
  sendMessage,
  listenMessages,
  listenUnreadCounts,
  markMessagesAsRead,
  setTypingState,
  listenTypingState,
  getUserById,
  addContactToUser,
  listenInboxMessages
} from './lib/firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('web_messenger_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [inboundSenderIds, setInboundSenderIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingContacts, setTypingContacts] = useState<{ [userId: string]: boolean }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [userId: string]: number }>({});
  const [copiedContactId, setCopiedContactId] = useState(false);

  // Synchronize current user presence to Firestore
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
      
      // Update our currentUser state locally if it changed in Firestore (e.g. addedContactIds list)
      const freshSelf = updatedUsers.find(u => u.id === currentUser.id);
      if (freshSelf) {
        setCurrentUser(prev => {
          if (!prev) return null;
          // Only update if something actually changed to avoid render loops
          if (JSON.stringify(prev.addedContactIds) !== JSON.stringify(freshSelf.addedContactIds) || prev.description !== freshSelf.description) {
            const updated = { ...prev, ...freshSelf };
            localStorage.setItem('web_messenger_user', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for inbound messages to auto-discover chats
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = listenInboxMessages(currentUser.id, (inboundMsgs) => {
      const senders = Array.from(new Set(inboundMsgs.map(m => m.senderId)));
      setInboundSenderIds(senders);
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
    setInboundSenderIds([]);
  };

  const handleSendMessage = (text: string) => {
    if (!selectedContactId || !currentUser) return;
    sendMessage(currentUser.id, selectedContactId, text);
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (!selectedContactId || !currentUser) return;
    setTypingState(currentUser.id, selectedContactId, isTyping);
  };

  // Search and add a contact by 12-digit numeric ID
  const handleAddContact = async (contactId: string) => {
    if (!currentUser) return;
    const userToFind = await getUserById(contactId);
    if (!userToFind) {
      throw new Error('User ID not found. Ensure the 12-digit key is correct.');
    }

    // Add to Firestore database
    await addContactToUser(currentUser.id, contactId);

    // Update local state immediately
    setCurrentUser(prev => {
      if (!prev) return null;
      const currentList = prev.addedContactIds || [];
      if (currentList.includes(contactId)) return prev;
      const updated = {
        ...prev,
        addedContactIds: [...currentList, contactId]
      };
      localStorage.setItem('web_messenger_user', JSON.stringify(updated));
      return updated;
    });

    // Select the contact automatically
    setSelectedContactId(contactId);
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
  };

  // Compile active contact objects (added contact IDs + inbound message sender IDs)
  const myContactIds = Array.from(new Set([
    ...(currentUser?.addedContactIds || []),
    ...inboundSenderIds
  ]));

  const myContactsList = users.filter(u => u.id !== currentUser?.id && myContactIds.includes(u.id));

  // Get active selected user profile object
  const activeContact = users.find((u) => u.id === selectedContactId);

  // Helper to format ID
  const formatIdWithSpaces = (id: string) => {
    return id.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  };

  const handleCopyContactId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedContactId(true);
    setTimeout(() => setCopiedContactId(false), 2000);
  };

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
            title={`${currentUser.name} (ID: ${formatIdWithSpaces(currentUser.id)})`}
            className="w-8 h-8 rounded-full border border-zinc-800 object-cover bg-zinc-900"
          />
        </div>
      </nav>

      {/* 2. Chat Sidebar directory */}
      <Sidebar
        currentUser={currentUser}
        contacts={myContactsList}
        allUsers={users}
        selectedContactId={selectedContactId}
        onSelectContact={handleSelectContact}
        onLogout={handleLogout}
        onAddContact={handleAddContact}
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

            {/* 4. Right Information Sidebar OVERHAULED with active contact bio profile card */}
            <aside id="right-sidebar" className="w-72 bg-[#0E0E10]/45 p-6 flex flex-col h-full overflow-y-auto shrink-0 border-l border-zinc-900/40">
              
              {/* Contact Profile Overview */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-900/60">
                <div className="relative mb-4">
                  <img
                    src={activeContact.avatar}
                    alt={activeContact.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover bg-zinc-900 border border-zinc-800 p-0.5"
                  />
                  <span
                    className={`absolute bottom-0 right-0 block h-4 w-4 rounded-full border-3 border-[#0E0E10] ${
                      activeContact.online ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}
                  />
                </div>
                <h3 className="text-sm font-bold text-white truncate max-w-full">{activeContact.name}</h3>
                <span className={`text-[10px] font-semibold mt-1 px-2.5 py-0.5 rounded-full ${
                  activeContact.online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {activeContact.online ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Contact Information & Copy ID Board */}
              <div className="py-6 space-y-5 border-b border-zinc-900/60">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">User Unique Key</span>
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl flex items-center justify-between">
                    <p className="text-xs font-mono font-bold text-emerald-400 truncate select-all pr-2">
                      {formatIdWithSpaces(activeContact.id)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyContactId(activeContact.id)}
                      title="Copy Key to Clipboard"
                      className="p-1.5 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0"
                    >
                      {copiedContactId ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* About Bio Section */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">About & Biography</span>
                  <div className="p-3.5 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      {activeContact.description || 'No custom bio description has been provided by this user.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Security & System Info widgets */}
              <div className="py-6 space-y-6">
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-3 font-mono">Connection Info</h4>
                  <div className="space-y-2.5">
                    <div className="p-3 bg-zinc-950/20 border border-zinc-900 rounded-xl space-y-1">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Terminal Protocol</div>
                      <div className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        AES-256 Verified End-to-End
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/20 border border-zinc-900 rounded-xl space-y-1">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Snapshot Sync Status</div>
                      <div className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        Live Synchronized &lt; 100ms
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Badge */}
              <div className="mt-auto p-4 bg-zinc-950/30 border border-zinc-900 rounded-xl text-center">
                <div className="inline-flex p-2 bg-blue-500/5 rounded-lg text-blue-500 mb-2">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-semibold text-zinc-300">Workspace Active</div>
                <p className="text-[9px] text-zinc-500 mt-1 leading-normal font-mono">
                  NODE_STATUS: ONLINE_CONNECTED
                </p>
              </div>
            </aside>
          </>
        ) : (
          <div id="no-chat-screen" className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0A0A0B]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-2xl animate-pulse"></div>
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800/60 rounded-2xl flex items-center justify-center text-zinc-500 relative z-10 shadow-lg">
                <MessageSquareDashed className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h3 className="text-base font-bold text-zinc-200">No active chat selected</h3>
            <p className="text-xs text-zinc-500 text-center max-w-sm mt-2 leading-relaxed font-medium">
              Select a friend from your chat directory, lookup a contact by their unique 12-digit numeric ID, or browse registered profiles in the "Discover" panel to establish a direct workspace connection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
