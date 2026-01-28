import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_SCRIPT_URL, locateRemoteData, APP_SCRIPT_TEMPLATE, backupTabToSheet } from '../services/googleSheetsService';
import { User } from '../types';
import { DEFAULT_NAV_ITEMS } from '../constants';

interface SettingsProps {
    onBackup?: () => Promise<void>;
    onRestore?: () => Promise<void>;
    users: User[];
    onAddUser: (u: User) => void;
    onUpdateUser: (u: User) => void;
    onDeleteUsers: (ids: string[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ onBackup, onRestore, users, onAddUser, onUpdateUser, onDeleteUsers }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [scriptUrl, setScriptUrl] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [backupFreq, setBackupFreq] = useState('hourly');
    const [loading, setLoading] = useState(false);
    const [backupLoading, setBackupLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');
    const [copyFeedback, setCopyFeedback] = useState('');

    const logoInputRef = useRef<HTMLInputElement>(null);

    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userFormData, setUserFormData] = useState<Partial<User>>({});
    const [userSearch, setUserSearch] = useState('');

    useEffect(() => {
        const storedScript = localStorage.getItem('wf_script_url_v3');
        const storedLogo = localStorage.getItem('wf_logo_url');
        const storedFreq = localStorage.getItem('wf_backup_frequency');

        setScriptUrl(storedScript || DEFAULT_SCRIPT_URL);
        setLogoUrl(storedLogo || '');
        setBackupFreq(storedFreq || 'hourly');
    }, []);

    const handleSave = () => {
        if (!scriptUrl) {
            setStatusType('error');
            setStatusMsg('Please enter a Web App URL.');
            return;
        }

        localStorage.setItem('wf_script_url_v3', scriptUrl);
        localStorage.setItem('wf_backup_frequency', backupFreq);

        if (logoUrl) {
            localStorage.setItem('wf_logo_url', logoUrl);
        } else {
            localStorage.removeItem('wf_logo_url');
        }

        setStatusType('success');
        setStatusMsg('Settings Saved Successfully!');

        setTimeout(() => {
            setStatusMsg('');
            window.location.reload();
        }, 1500);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 500 * 1024) {
            alert("File is too large. Please upload an image smaller than 500KB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setLogoUrl(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleResetLogo = () => {
        setLogoUrl('');
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    const validateUrl = (url: string) => {
        if (!url) {
            setStatusType('error');
            setStatusMsg('Please enter a URL first.');
            return false;
        }
        if (!url.includes('script.google.com')) {
            setStatusType('error');
            setStatusMsg('❌ Invalid Domain. Must be "script.google.com".');
            return false;
        }
        if (!url.endsWith('/exec')) {
            setStatusType('error');
            setStatusMsg('❌ Invalid Ending. URL must end with "/exec". (Did you copy the Editor link?)');
            return false;
        }
        return true;
    };

    const handleTestConnection = async () => {
        if (!validateUrl(scriptUrl)) return;

        setLoading(true);
        setStatusMsg('Testing connection to Google...');
        setStatusType('neutral');

        try {
            const result = await locateRemoteData(scriptUrl);
            if (result && !result.error) {
                setStatusType('success');
                setStatusMsg('✅ Connection Successful! Found "WareFlow Reports" folder.');
            } else {
                setStatusType('error');
                setStatusMsg(`❌ Script Error: ${result?.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            setStatusType('error');
            if (e.message === 'Failed to fetch') {
                setStatusMsg('❌ Connection Blocked. Check Deploy Settings: "Who has access" MUST be "Anyone".');
            } else {
                setStatusMsg(`❌ Network Error: ${e.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleManualBackup = async () => {
        if (!onBackup) return;
        if (!confirm("Are you sure you want to overwrite the cloud backup with the current system data?")) return;
        setBackupLoading(true);
        try {
            await onBackup();
            alert("Backup Complete!");
        } catch (e) {
            alert("Backup Failed. See console.");
        } finally {
            setBackupLoading(false);
        }
    };

    const handleManualRestore = async () => {
        if (!onRestore) return;
        if (!confirm("⚠️ DANGER: This will OVERWRITE all local data (Items, History, Machines, etc.) with data from the cloud.\n\nAre you sure?")) return;
        setRestoreLoading(true);
        try {
            await onRestore();
            alert("Restore Complete! Page will reload.");
            window.location.reload();
        } catch (e: any) {
            alert(`Restore Failed: ${e.message}\n\nPlease check script permissions.`);
        } finally {
            setRestoreLoading(false);
        }
    };

    const copyScriptCode = () => {
        navigator.clipboard.writeText(APP_SCRIPT_TEMPLATE);
        setCopyFeedback('Code copied to clipboard!');
        setTimeout(() => setCopyFeedback(''), 3000);
    };

    const handleUserFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = { ...userFormData };
        ['allowedLocationIds', 'allowedSectorIds', 'allowedDivisionIds', 'allowedMenus'].forEach(key => {
            if (typeof payload[key] === 'string') {
                payload[key] = payload[key].split(',').map((s: string) => s.trim()).filter(Boolean);
            }
        });

        if (editingUser) {
            onUpdateUser(payload as User);
        } else {
            onAddUser(payload as User);
        }
        setShowUserForm(false);
    };

    const openUserForm = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setUserFormData({ ...user });
        } else {
            setEditingUser(null);
            setUserFormData({ role: 'user', name: '', username: '', email: '', password: '' });
        }
        setShowUserForm(true);
    };

    const handleDeleteUser = (username: string) => {
        if (confirm(`Delete user '${username}'?`)) {
            onDeleteUsers([username]);
        }
    };

    const handleBackupUsers = async () => {
        if (!scriptUrl) { alert("Configure URL first."); return; }
        if (!confirm("Backup Users to Cloud?")) return;
        setBackupLoading(true);
        try {
            const headers = ['Username', 'Name', 'Role', 'Email', 'Allowed Locations', 'Allowed Sectors', 'Allowed Divisions'];
            const rows = users.map((u: User) => [
                u.username, u.name, u.role, u.email,
                (u.allowedLocationIds || []).join(';'),
                (u.allowedSectorIds || []).join(';'),
                (u.allowedDivisionIds || []).join(';')
            ]);
            await backupTabToSheet(scriptUrl, 'users', [headers, ...rows]);
            alert("Users Backed Up!");
        } catch (e) { alert("Failed."); }
        finally { setBackupLoading(false); }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-100 mb-6 pb-2">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`pb-2 px-1 text-sm font-bold border-b-2 transition ${activeTab === 'general' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        ⚙️ General Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-2 px-1 text-sm font-bold border-b-2 transition ${activeTab === 'users' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        👥 Users & Roles
                    </button>
                </div>

                {/* --- GENERAL TAB --- */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        {/* Branding Section */}
                        <div className="space-y-4 pb-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Company Logo</h3>
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                {/* Preview Area */}
                                <div className="w-32 h-32 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <span className="text-gray-400 text-xs text-center px-2">Default Logo</span>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex-1 space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">
                                        Upload New Logo
                                    </label>
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100
                                "
                                    />
                                    <p className="text-xs text-gray-500">
                                        Supported formats: PNG, JPG, GIF. Max size: 500KB.
                                    </p>

                                    {logoUrl && (
                                        <button
                                            onClick={handleResetLogo}
                                            className="text-sm text-red-600 hover:text-red-800 font-medium underline"
                                        >
                                            Remove Custom Logo (Reset to Default)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* API URL Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800">Cloud Connection</h3>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Google Apps Script Web App URL
                                    <span className="ml-2 font-normal text-gray-500">(Required for Drive Backup & Sheets Sync)</span>
                                </label>

                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={scriptUrl}
                                        onChange={(e) => setScriptUrl(e.target.value)}
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Automatic Backup Settings */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Automatic Backup Frequency
                                    </label>
                                    <select
                                        value={backupFreq}
                                        onChange={(e) => setBackupFreq(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                    >
                                        <option value="disabled">Disabled</option>
                                        <option value="30min">Every 30 Minutes</option>
                                        <option value="hourly">Hourly (Default)</option>
                                        <option value="daily">Daily (Every 24 Hours)</option>
                                        <option value="weekly">Weekly (Every 7 Days)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Data is saved to the configured Google Sheet.
                                    </p>
                                </div>

                                {/* Manual Actions */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Manual Actions
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleManualRestore}
                                            disabled={restoreLoading}
                                            className="flex-1 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-bold text-sm flex items-center justify-center gap-2"
                                        >
                                            {restoreLoading ? <span className="animate-spin">↻</span> : <span>📥</span>}
                                            Restore All
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Restore overwrites local data with cloud data.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="text-sm text-gray-600 flex-1 mr-4">
                                    <p>Status: <span className={`font-bold ${statusType === 'success' ? 'text-green-600' : statusType === 'error' ? 'text-red-600' : 'text-gray-800'}`}>
                                        {statusMsg || 'Ready to Save'}
                                    </span></p>
                                    {statusMsg.includes('Connection Blocked') && (
                                        <p className="text-xs text-red-500 mt-1">
                                            💡 Fix: Go to Script &gt; Deploy &gt; Manage Deployments &gt; Edit &gt; Set <strong>Who has access</strong> to <strong>Anyone</strong>.
                                        </p>
                                    )}
                                    {statusMsg.includes('Saved Successfully') && (
                                        <p className="text-xs text-green-600 mt-1">
                                            Application will reload shortly to apply changes...
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={loading}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {loading ? <span className="animate-spin">↻</span> : <span>🔍</span>}
                                        Test
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm"
                                    >
                                        Save Settings
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Script Code Helper */}
                        <div className="pt-6 border-t border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Backend Script Code</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                If you are seeing "Script is outdated" or "Restore Failed", you must update your script below.
                            </p>

                            <div className="relative">
                                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto max-h-64">
                                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                                        {APP_SCRIPT_TEMPLATE}
                                    </pre>
                                </div>
                                <button
                                    onClick={copyScriptCode}
                                    className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded border border-white/20 backdrop-blur-sm transition"
                                >
                                    {copyFeedback || 'Copy Code'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="relative w-64">
                                <input type="text" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full pl-8 pr-4 py-2 border rounded-lg text-sm" />
                                <span className="absolute left-2.5 top-2.5 text-gray-400">🔍</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openUserForm()} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700">+ Add User</button>
                            </div>
                        </div>

                        <div className="overflow-auto border rounded-lg">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-3">Username</th>
                                        <th className="p-3">Full Name</th>
                                        <th className="p-3">Role</th>
                                        <th className="p-3">Email</th>
                                        <th className="p-3">Permissions (Loc/Sec/Div)</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map(u => (
                                        <tr key={u.username} className="hover:bg-blue-50">
                                            <td className="p-3 font-bold">{u.username}</td>
                                            <td className="p-3">{u.name}</td>
                                            <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-xs">{u.role}</span></td>
                                            <td className="p-3 text-gray-500">{u.email}</td>
                                            <td className="p-3 text-xs text-gray-500 max-w-xs truncate" title={`L:${u.allowedLocationIds?.join(',') || '-'} S:${u.allowedSectorIds?.join(',') || '-'} D:${u.allowedDivisionIds?.join(',') || '-'}`}>
                                                L: {u.allowedLocationIds?.length || 0} | S: {u.allowedSectorIds?.length || 0} | D: {u.allowedDivisionIds?.length || 0}
                                            </td>
                                            <td className="p-3 text-right space-x-2">
                                                <button onClick={() => openUserForm(u)} className="text-blue-600 hover:underline">Edit</button>
                                                <button onClick={() => handleDeleteUser(u.username)} className="text-red-600 hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No users found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- USER MODAL --- */}
                {showUserForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold">{editingUser ? 'Edit User' : 'New User'}</h3>
                                <button onClick={() => setShowUserForm(false)}>✕</button>
                            </div>
                            <form onSubmit={handleUserFormSubmit} className="p-6 overflow-y-auto space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-gray-500">Username</label><input required disabled={!!editingUser} className="w-full border rounded p-2" value={userFormData.username || ''} onChange={e => setUserFormData({ ...userFormData, username: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Full Name</label><input required className="w-full border rounded p-2" value={userFormData.name || ''} onChange={e => setUserFormData({ ...userFormData, name: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Role</label>
                                        <select className="w-full border rounded p-2" value={userFormData.role || 'user'} onChange={e => setUserFormData({ ...userFormData, role: e.target.value as any })}>
                                            <option value="admin">Admin</option>
                                            <option value="warehouse_manager">Warehouse Manager</option>
                                            <option value="warehouse_supervisor">Warehouse Supervisor</option>
                                            <option value="maintenance_manager">Maintenance Manager</option>
                                            <option value="maintenance_engineer">Maintenance Engineer</option>
                                            <option value="user">User (Operator)</option>
                                        </select>
                                    </div>
                                    <div><label className="block text-xs font-bold text-gray-500">Email</label><input type="email" className="w-full border rounded p-2" value={userFormData.email || ''} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-500">Password</label><input type="text" className="w-full border rounded p-2" placeholder={editingUser ? "(Unchanged)" : "Enter password"} value={userFormData.password || ''} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })} required={!editingUser} /></div>

                                <div className="pt-2 border-t">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Permissions (Comma Separated IDs)</h4>
                                    <div className="space-y-2">
                                        <div><label className="block text-xs text-gray-500">Allowed Locations</label><input className="w-full border rounded p-2 text-sm" placeholder="e.g. WH-001, WH-002" value={Array.isArray(userFormData.allowedLocationIds) ? userFormData.allowedLocationIds.join(', ') : userFormData.allowedLocationIds || ''} onChange={e => setUserFormData({ ...userFormData, allowedLocationIds: e.target.value as any })} /></div>
                                        <div><label className="block text-xs text-gray-500">Allowed Sectors</label><input className="w-full border rounded p-2 text-sm" placeholder="e.g. SEC-001" value={Array.isArray(userFormData.allowedSectorIds) ? userFormData.allowedSectorIds.join(', ') : userFormData.allowedSectorIds || ''} onChange={e => setUserFormData({ ...userFormData, allowedSectorIds: e.target.value as any })} /></div>
                                        <div><label className="block text-xs text-gray-500">Allowed Divisions</label><input className="w-full border rounded p-2 text-sm" placeholder="e.g. DIV-001" value={Array.isArray(userFormData.allowedDivisionIds) ? userFormData.allowedDivisionIds.join(', ') : userFormData.allowedDivisionIds || ''} onChange={e => setUserFormData({ ...userFormData, allowedDivisionIds: e.target.value as any })} /></div>
                                    </div>

                                    <h4 className="text-xs font-bold text-gray-400 uppercase mt-4 mb-2">Sidebar Menu Visibility</h4>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded border">
                                        {DEFAULT_NAV_ITEMS.map(item => {
                                            const isChecked = (userFormData.allowedMenus || []).includes(item.id);
                                            return (
                                                <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const current = userFormData.allowedMenus || [];
                                                            const next = e.target.checked
                                                                ? [...current, item.id]
                                                                : current.filter(id => id !== item.id);
                                                            setUserFormData({ ...userFormData, allowedMenus: next });
                                                        }}
                                                    />
                                                    <span className="text-xs truncate">{item.icon} {item.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Save User</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Settings;