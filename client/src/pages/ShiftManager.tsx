import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Sun, Moon } from 'lucide-react';

export default function ShiftManager() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const { activeShift, startShift, endShift, checkActiveShift } = useShiftStore();

    useEffect(() => {
        if (user) {
            checkActiveShift(user.id);
        }
    }, [user, checkActiveShift]);

    useEffect(() => {
        // If active shift found, redirect to dashboard automatically
        if (activeShift) {
            // navigate('/dashboard'); 
        }
    }, [activeShift, navigate]);

    const handleViewHistory = () => {
        navigate('/shifts/history');
    };

    const handleStartShift = async (type: 'DAY' | 'NIGHT') => {
        if (!user) return;
        try {
            await startShift(user.id, type);
            navigate('/dashboard');
        } catch (error) {
            alert('Failed to start shift');
        }
    };

    if (!user) return <div>Please log in...</div>;

    if (activeShift) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Active Shift in Progress</CardTitle>
                        <CardDescription className="text-center text-slate-400">
                            You are currently clocked in for the {activeShift.type} shift.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-500 text-lg py-6"
                            onClick={() => navigate('/dashboard')}
                        >
                            Continue to Clean Dashboard
                        </Button>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => endShift()}
                        >
                            End Shift
                        </Button>
                        {user.role === 'SENIOR' && (
                            <Button
                                variant="outline"
                                className="w-full border-slate-600 hover:bg-slate-700"
                                onClick={handleViewHistory}
                            >
                                View Shift History
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">ICU Manager</h1>
                <p className="text-slate-400">Welcome, {user.name}. Please start your shift to proceed.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
                <button
                    onClick={() => handleStartShift('DAY')}
                    className="flex flex-col items-center justify-center p-8 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all shadow-lg hover:scale-105 group"
                >
                    <Sun className="w-16 h-16 text-amber-600 mb-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-2xl font-bold text-amber-900">Day Shift</span>
                    <span className="text-sm text-amber-700 mt-2">07:00 - 19:00</span>
                </button>

                <button
                    onClick={() => handleStartShift('NIGHT')}
                    className="flex flex-col items-center justify-center p-8 bg-indigo-900 hover:bg-indigo-800 rounded-xl transition-all shadow-lg hover:scale-105 group border border-indigo-700"
                >
                    <Moon className="w-16 h-16 text-indigo-300 mb-4 group-hover:-rotate-12 transition-transform" />
                    <span className="text-2xl font-bold text-white">Night Shift</span>
                    <span className="text-sm text-indigo-300 mt-2">19:00 - 07:00</span>
                </button>
            </div>

            {user.role === 'SENIOR' && (
                <div className="mt-8">
                    <Button variant="outline" className="text-slate-400 hover:text-white border-slate-700" onClick={handleViewHistory}>
                        View Shift History (Admin)
                    </Button>
                </div>
            )}
        </div>
    );
}
