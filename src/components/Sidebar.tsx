import { useState, FormEvent } from 'react';
import { LogOut, Search, User, MessageSquareCode, UserPlus, Copy, Check, Compass, Sparkles, X, Plus } from 'lucide-react';
import { User as UserType } from '../types';

interface SidebarProps {
  currentUser: UserType;
  contacts: UserType[]; // Only added / messaged contacts
  allUsers: UserType[]; // All registered users (for Discover)
  selectedContactId: string | null;
  onSelectContact: (userId: string) => void;
  onLogout: () => void;
  onAddContact: (contactId: string) => Promise<void>;
  typingContacts: { [userId: string]: boolean };
  unreadCounts: { [userId: string]: number };
}

export default function Sidebar({
  currentUser,
  contacts,
  allUsers,
  selectedContactId,
  onSelectContact,
  onLogout,
  onAddContact,
  typingContacts,
  unreadCounts,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'discover'>('chats');
  const [searchTerm, setSearchTerm] = useState('');
  const [addIdInput, setAddIdInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Formatting 12-digit ID
  const formatIdWithSpaces = (id: string) => {
    return id.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  };

  const handleCopyMyId = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Submit add contact ID
  const handleAddFriendSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    const cleanedId = addIdInput.replace(/\s/g, '');

    if (!cleanedId || cleanedId.length !== 12 || !/^\d+$/.test(cleanedId)) {
      setAddError('Must be exactly a 12-digit number.');
      return;
    }

    if (cleanedId === currentUser.id) {
      setAddError("You cannot add your own ID.");
      return;
    }

    setIsAdding(true);
    try {
      await onAddContact(cleanedId);
      setAddSuccess('Contact added successfully!');
      setAddIdInput('');
      setActiveTab('chats');
      // Clear success after 3 seconds
      setTimeout(() => setAddSuccess(null), 3000);
    } catch (err: any) {
      setAddError(err.message || 'User ID not found in system.');
    } finally {
      setIsAdding(false);
    }
  };

  // Filter contacts by search term
  const filteredContacts = contacts.filter((u) => {
    const match = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.id.includes(searchTerm);
    return match;
  });

  // Filter Discover users (exclude current user and people already in contacts)
  const contactIds = contacts.map(c => c.id);
  const discoverUsers = allUsers
    .filter(u => u.id !== currentUser.id && !contactIds.includes(u.id))
    .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm));

  return (
    <div id="sidebar-container" className="w-80 flex flex-col bg-[#0A0A0B] border-r border-zinc-800/50 h-full shrink-0">
      
      {/* 1. Header & ID Display */}
      <div className="p-5 border-b border-zinc-900 bg-[#0E0E10]/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Direct Terminal</h2>
          <div className="p-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-500">
            <MessageSquareCode className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Current User ID quick-copy board */}
        <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 font-mono">My Connection Key</p>
            <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5 truncate select-all">
              {formatIdWithSpaces(currentUser.id)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyMyId}
            title="Copy ID to Clipboard"
            className="p-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0 ml-2"
          >
            {copiedId ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Direct Add Contact Input Form */}
      <div className="px-5 pt-4 pb-2 bg-[#0A0A0B]">
        <form onSubmit={handleAddFriendSubmit} className="space-y-2">
          <label htmlFor="friend-id-input" className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono">Add Friend by ID</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="friend-id-input"
                type="text"
                placeholder="Enter 12-digit User ID"
                maxLength={14}
                value={addIdInput}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').substring(0, 12);
                  const formatted = cleaned.replace(/(\d{4})(\d{4})?(\d{4})?/, (_, p1, p2, p3) => {
                    let res = p1;
                    if (p2) res += ' ' + p2;
                    if (p3) res += ' ' + p3;
                    return res;
                  });
                  setAddIdInput(formatted);
                  setAddError(null);
                }}
                className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all"
              />
              <UserPlus className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-zinc-600" />
            </div>
            <button
              id="add-friend-btn"
              type="submit"
              disabled={isAdding || !addIdInput.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-45 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
          </div>
          {addError && (
            <p className="text-[10px] text-rose-400 font-semibold leading-normal">{addError}</p>
          )}
          {addSuccess && (
            <p className="text-[10px] text-emerald-400 font-semibold leading-normal">{addSuccess}</p>
          )}
        </form>
      </div>

      {/* 3. Tab Toggles */}
      <div className="px-5 py-3 flex gap-2 border-b border-zinc-900/60 bg-[#0A0A0B]">
        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'chats'
              ? 'bg-zinc-900 text-white border border-zinc-800'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageSquareCode className="w-3.5 h-3.5" />
          My Chats ({contacts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('discover')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'discover'
              ? 'bg-zinc-900 text-white border border-zinc-800'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Discover
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-950/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-600" />
          <input
            id="sidebar-search"
            type="text"
            placeholder={activeTab === 'chats' ? "Search contacts..." : "Search registered profiles..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/40 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-800 transition-all"
          />
        </div>
      </div>

      {/* 4. Active Directory List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#0A0A0B]">
        {activeTab === 'chats' ? (
          filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-zinc-600">
              <User className="w-8 h-8 mx-auto text-zinc-800 mb-2.5" />
              <p className="text-xs font-semibold">No contacts added yet</p>
              <p className="text-[10px] text-zinc-500 mt-1.5 leading-normal max-w-[200px] mx-auto">
                Type a 12-digit User ID in the form above or check the "Discover" tab to add other active profiles.
              </p>
            </div>
          ) : (
            filteredContacts.map((user) => {
              const isSelected = selectedContactId === user.id;
              const isTyping = typingContacts[user.id];
              const unreadCount = unreadCounts[user.id] || 0;

              return (
                <button
                  key={user.id}
                  id={`contact-item-${user.id}`}
                  onClick={() => onSelectContact(user.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all border text-left cursor-pointer relative group ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-600/30 text-white'
                      : 'border-transparent hover:bg-zinc-900/40 hover:border-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {/* Status Indicator circle matching the design template */}
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-8.5 h-8.5 rounded-full object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border border-zinc-950 ${
                        user.online ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    />
                  </div>

                  {/* Name and bio excerpt */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-zinc-100 font-bold' : 'text-zinc-300'}`}>
                        {user.name}
                      </span>
                      {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {isTyping ? (
                      <p className="text-[10px] text-blue-500 animate-pulse font-bold mt-0.5">
                        typing...
                      </p>
                    ) : (
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {user.description || 'No description.'}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )
        ) : (
          // Discover users
          discoverUsers.length === 0 ? (
            <div className="p-8 text-center text-zinc-600">
              <Compass className="w-8 h-8 mx-auto text-zinc-800 mb-2.5" />
              <p className="text-xs font-semibold">No other profiles found</p>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto">
                All registered users are already in your conversations thread!
              </p>
            </div>
          ) : (
            discoverUsers.map((user) => (
              <div
                key={user.id}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-900 hover:border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/45 transition-all text-left"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover bg-zinc-900 border border-zinc-800"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-300 truncate">{user.name}</p>
                    <p className="text-[9px] font-mono text-zinc-500 truncate">ID: {formatIdWithSpaces(user.id)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAddContact(user.id)}
                  title="Add to My Chats"
                  className="p-1.5 bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 rounded-lg text-white transition-all cursor-pointer shrink-0 ml-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* 5. Bottom Current User Bio Dashboard Card */}
      <div className="mt-auto p-4 border-t border-zinc-900 bg-[#0E0E10]/40 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            className="w-8.5 h-8.5 rounded-full object-cover border border-zinc-800 bg-zinc-900"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{currentUser.description || 'Active Connection'}</p>
          </div>
        </div>
        <button
          id="logout-sidebar-btn"
          onClick={onLogout}
          title="Disconnect from Server"
          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
