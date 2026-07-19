import { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  Trash2,
  Edit3,
  Search,
  Check,
  X,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Info,
  Mail,
  Smartphone,
  ShieldCheck,
  UserCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { User } from '../types';
import { listenUsers, saveUserProfile, deleteUser } from '../lib/firebase';

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Edit form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editOnline, setEditOnline] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);

  // Read registered users in real-time
  useEffect(() => {
    const unsubscribe = listenUsers((allUsers) => {
      // Exclude admin user from the list to avoid self-deletion
      const filtered = allUsers.filter(u => u.id !== '201120112011');
      setUsersList(filtered);
    });
    return () => unsubscribe();
  }, []);

  // Filter users based on search
  const filteredUsers = usersList.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.id.includes(searchTerm) ||
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditBio(user.description || '');
    setEditAvatar(user.avatar);
    setEditOnline(user.online);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editName.trim()) {
      setErrorMessage('Name cannot be empty.');
      return;
    }
    if (!editEmail.trim() || !editEmail.trim().endsWith('@gmail.com')) {
      setErrorMessage('A valid Gmail address ending with @gmail.com is required.');
      return;
    }

    try {
      const updatedUser: User = {
        ...editingUser,
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        avatar: editAvatar,
        description: editBio.trim(),
        online: editOnline
      };

      await saveUserProfile(updatedUser, editOnline);
      setSuccessMessage(`User "${editName}" updated successfully!`);
      setEditingUser(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update user profile.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      setSuccessMessage('Account permanently removed.');
      setShowDeleteConfirmId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to delete user.');
    }
  };

  const randomizeAvatarForEdit = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setEditAvatar(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${randomSeed}`);
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#070709] text-zinc-300 overflow-hidden font-sans">
      {/* Admin Top Header */}
      <header className="h-16 border-b border-zinc-900 bg-[#0A0A0C] px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight font-mono uppercase">Master Workspace Control</h1>
            <p className="text-[10px] text-zinc-500 font-mono">System-Level Account Administration</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">Admin Node Live</span>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Admin Panel
          </button>
        </div>
      </header>

      {/* Main Admin Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Table of accounts */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col space-y-6">
          
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0C] border border-zinc-900 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Total User Accounts</p>
                <p className="text-2xl font-bold text-white mt-1 font-mono">{usersList.length}</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/15">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#0A0A0C] border border-zinc-900 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Active Connections</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                  {usersList.filter(u => u.online).length}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/15">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#0A0A0C] border border-zinc-900 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Workspace Role</p>
                <p className="text-xs font-bold text-rose-400 mt-2 font-mono uppercase bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md inline-block">
                  Root Administrator
                </p>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/15">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Table Header and Search */}
          <div className="bg-[#0A0A0C] border border-zinc-900 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wider uppercase font-mono">Registered Workspace Accounts</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Real-time listing of registered communication keys</p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search by 12-digit ID, Name, or Gmail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none transition-all"
                />
                <div className="absolute left-3.5 top-3.5 text-zinc-600">
                  <Search className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* List of Users */}
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <Info className="w-8 h-8 mx-auto text-zinc-700" />
                <p className="text-sm">No registered user accounts found matching your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-950/40 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      <th className="py-4 px-6 font-semibold">User Details</th>
                      <th className="py-4 px-6 font-semibold">12-Digit ID</th>
                      <th className="py-4 px-6 font-semibold">Gmail Address</th>
                      <th className="py-4 px-6 font-semibold">Connection Status</th>
                      <th className="py-4 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-zinc-950/25 transition-all group">
                        {/* Profile Details */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar || 'https://api.dicebear.com/7.x/pixel-art/svg'}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 p-0.5 object-cover"
                            />
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
                                {user.name}
                              </div>
                              <div className="text-[10px] text-zinc-500 max-w-[200px] truncate" title={user.description}>
                                {user.description || 'No custom bio set.'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* User ID */}
                        <td className="py-4 px-6 font-mono text-xs text-zinc-400 tracking-wider">
                          {user.id.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                        </td>

                        {/* Gmail Address */}
                        <td className="py-4 px-6 font-mono text-xs text-zinc-400 flex items-center gap-1.5 pt-7">
                          <Mail className="w-3.5 h-3.5 text-zinc-600" />
                          {user.email}
                        </td>

                        {/* Online status */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${user.online ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-zinc-700'}`} />
                            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-400">
                              {user.online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(user)}
                              className="p-2 bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Edit User Profile"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {showDeleteConfirmId === user.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-1 rounded-lg">
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirmId(null)}
                                  className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirmId(user.id)}
                                className="p-2 bg-zinc-900/60 border border-zinc-800/80 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                title="Remove User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Side edit sheet */}
        {editingUser && (
          <aside className="w-96 border-l border-zinc-900 bg-[#0A0A0C] p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Modify Account</h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 rounded-lg cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar Preview & Randomizer */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">Profile Avatar</label>
                <div className="flex items-center gap-4 p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <img
                    src={editAvatar}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 p-0.5 object-cover"
                  />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[10px] text-zinc-500 font-mono">Vector SVG illustration generated from seed.</p>
                    <button
                      type="button"
                      onClick={randomizeAvatarForEdit}
                      className="px-3 py-1.5 text-[10px] font-bold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg hover:text-white transition-all cursor-pointer flex items-center gap-1 text-zinc-300"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin-hover" />
                      Randomize
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1.5">User Nickname</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-rose-500/40 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1.5">Gmail Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-rose-500/40 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1.5">User Biography</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-rose-500/40 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Connection status toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-white">Connection Status</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Forces simulated connection online/offline</div>
                  </div>
                  <button
                    onClick={() => setEditOnline(!editOnline)}
                    className="text-zinc-400 hover:text-white cursor-pointer transition-all"
                  >
                    {editOnline ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-900 flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-rose-900/10 transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
