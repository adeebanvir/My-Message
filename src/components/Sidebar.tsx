import { useState } from 'react';
import { LogOut, Search, User, MessageSquareCode, Circle } from 'lucide-react';
import { User as UserType } from '../types';

interface SidebarProps {
  currentUser: UserType;
  users: UserType[];
  selectedContactId: string | null;
  onSelectContact: (userId: string) => void;
  onLogout: () => void;
  typingContacts: { [userId: string]: boolean };
  unreadCounts: { [userId: string]: number };
}

export default function Sidebar({
  currentUser,
  users,
  selectedContactId,
  onSelectContact,
  onLogout,
  typingContacts,
  unreadCounts,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out the current user, then filter by search term
  const filteredUsers = users
    .filter((u) => u.id !== currentUser.id)
    .filter((u) => {
      const match = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchTerm.toLowerCase());
      return match;
    });

  return (
    <div id="sidebar-container" className="w-72 flex flex-col bg-[#0A0A0B] border-r border-zinc-800/50 h-full shrink-0">
      {/* Branding Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
          <div className="p-1.5 bg-zinc-900/80 border border-zinc-800/60 rounded-lg text-blue-500">
            <MessageSquareCode className="w-4 h-4" />
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            id="user-search"
            type="text"
            placeholder="Search threads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800/60 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-all"
          />
        </div>

        {/* Directory Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            Contacts ({filteredUsers.length})
          </span>
        </div>

        {/* Users list container */}
        <div className="space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-zinc-600">
              <User className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-xs">No active contacts found</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedContactId === user.id;
              const isTyping = typingContacts[user.id];
              const unreadCount = unreadCounts[user.id] || 0;

              return (
                <button
                  key={user.id}
                  id={`contact-item-${user.id}`}
                  onClick={() => onSelectContact(user.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all border text-left cursor-pointer relative group ${
                    isSelected
                      ? 'bg-blue-500/5 border-blue-500/20 text-white'
                      : 'border-transparent hover:bg-zinc-900/40 hover:border-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {/* Status Indicator circle matching the design template */}
                  <div className="relative shrink-0">
                    <span
                      className={`block h-2 w-2 rounded-full ${
                        isSelected
                          ? 'bg-blue-500'
                          : user.online
                          ? 'bg-green-500'
                          : 'bg-zinc-700'
                      }`}
                    />
                  </div>

                  {/* Profile Avatar */}
                  <img
                    src={user.avatar}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover bg-zinc-900 border border-zinc-800"
                  />

                  {/* Name and unread count */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                        {user.name}
                      </span>
                      {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full scale-90">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {isTyping && (
                      <p className="text-[10px] text-blue-400 animate-pulse mt-0.5 font-medium">
                        typing...
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Active Google Auth badge matching design template */}
      <div className="mt-auto p-4 border-t border-zinc-900 bg-zinc-950/20">
        <div className="flex items-center space-x-3 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex-shrink-0">
            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-black font-bold">
              G
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">
            Google Auth Active
          </div>
        </div>
      </div>
    </div>
  );
}
