import { useNavigate } from 'react-router-dom';
import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/authApi';
import { Dna } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            const response = await authApi.login(username.trim(), password.trim());
            login(response.token, response.user);
            toast.success(`Welcome back, ${response.user.name}`);
            navigate('/dashboard');
        } catch (error: any) {
            console.error(error);
            const msg = error.message || 'Login failed';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Dna className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">ICU Manager</h1>
                    <p className="text-slate-500">Sign in to access patient records</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Enter password"
                        />
                    </div>
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                            {errorMsg}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <div className="text-center text-xs text-slate-400 mt-4">
                        <p>Default password: password</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
