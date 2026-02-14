import { useNavigate } from 'react-router-dom';
import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { Dna } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const [username, setUsername] = React.useState('nurse');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // Simple mock authentication logic
        const lowerUser = username.toLowerCase();
        if (lowerUser.includes('senior') || lowerUser.includes('admin') || lowerUser.includes('dr')) {
            login('mock-jwt-token-senior', {
                id: 'mock-senior-id',
                username: 'senior',
                name: 'Dr. House',
                role: 'SENIOR'
            });
        } else {
            login('mock-jwt-token-nurse', {
                id: 'mock-nurse-id',
                username: 'nurse',
                name: 'Jane Nurse',
                role: 'NURSE'
            });
        }
        navigate('/dashboard');
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
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            defaultValue="password"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
