import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ShiftRibbon from '../../features/shift/ShiftRibbon';
import {
    Dna,
    LayoutDashboard,
    Users,
    ClipboardList,
    LogOut,
    Menu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { cn } from '../../lib/utils';
import { Toaster } from '../ui/sonner';

export default function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { checkActiveShift } = useShiftStore();

    useEffect(() => {
        if (user) {
            checkActiveShift(user.id);
        }
    }, [user, checkActiveShift]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'My Shift', path: '/shift' },
        ...(user?.role === 'SENIOR' ? [{ icon: ClipboardList, label: 'Admin', path: '/admin' }] : []),
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col h-screen print:hidden",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <Dna className="w-8 h-8 text-blue-500 mr-3" />
                    <span className="text-lg font-bold">ICU Manager</span>
                </div>

                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setSidebarOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-auto w-full p-4 border-t border-slate-800">
                    <div className="flex items-center mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                            {user?.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">{user?.name}</p>
                            <p className="text-xs text-slate-400 capitalize">{user?.role.toLowerCase()}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 print:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-semibold text-slate-900">ICU Manager</span>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto flex flex-col">
                    <ShiftRibbon />
                    <Outlet />
                </main>
            </div>
            <Toaster />
        </div>
    );
}
