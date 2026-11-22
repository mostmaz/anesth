
import { useState, useEffect } from 'react';
import { adminApi, User } from '../../api/adminApi';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';

export default function UserManagementTab() {
    const [users, setUsers] = useState<User[]>([]);

    // New User Form State
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'SENIOR' | 'RESIDENT' | 'NURSE'>('NURSE');

    const fetchUsers = async () => {
        try {
            const data = await adminApi.getUsers();
            setUsers(data);
        } catch (error) {
            toast.error("Failed to load users");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminApi.createUser({ name: newName, username: newUsername, password: newPassword, role: newRole });
            toast.success("User created successfully");
            setNewName('');
            setNewUsername('');
            setNewPassword('');
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || "Failed to create user");
        }
    };

    // A senior can set a new password for any account (e.g. one still on the old shared default).
    const handleResetPassword = async (user: User) => {
        const newPassword = prompt(`Temporary password for ${user.name} (at least 8 characters). They will be asked to choose their own at their next sign-in, and are signed out everywhere now:`);
        if (newPassword === null) return;
        try {
            await adminApi.resetPassword(user.id, newPassword);
            toast.success(`Password updated for ${user.name}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to reset password");
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await adminApi.deleteUser(id);
            toast.success("User deleted");
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete user");
        }
    };

    return (
        <div className="space-y-8">
            {/* Create User Form */}
            <div className="bg-slate-50 p-5 rounded-lg border">
                <h3 className="font-medium mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5" /> Add New User</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input className="w-full p-2 border rounded" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Sara Ahmed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input className="w-full p-2 border rounded" required value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="e.g. sara.nurse" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input className="w-full p-2 border rounded" required type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select className="w-full p-2 border rounded" value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                            <option value="NURSE">Nurse</option>
                            <option value="RESIDENT">Resident</option>
                            <option value="SENIOR">Senior</option>
                        </select>
                    </div>
                    <Button type="submit">Create Account</Button>
                </form>
                <p className="text-xs text-slate-500 mt-3">The password you set is temporary: the new user is asked to choose their own the first time they sign in.</p>
            </div>

            {/* User List */}
            <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[560px]">
                    <thead className="bg-slate-100 text-slate-600 font-medium">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Username</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Last sign-in</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="p-3 font-medium">{user.name}</td>
                                <td className="p-3 text-muted-foreground">{user.username}</td>
                                <td className="p-3">
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${user.role === 'SENIOR' ? 'bg-purple-100 text-purple-700' :
                                        user.role === 'RESIDENT' ? 'bg-blue-100 text-blue-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-3 text-muted-foreground whitespace-nowrap">
                                    {user.lastLoginAt
                                        ? new Date(user.lastLoginAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                        : <span className="text-slate-400">Not since 20 Nov 2026</span>}
                                </td>
                                <td className="p-3 text-right">
                                    <Button variant="ghost" size="sm" title="Reset password" onClick={() => handleResetPassword(user)}>
                                        <KeyRound className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteUser(user.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
