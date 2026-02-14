import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { type ReactNode } from 'react';

interface ShiftGuardProps {
    children: ReactNode;
}

export default function ShiftGuard({ children }: ShiftGuardProps) {
    const user = useAuthStore((state) => state.user);
    const activeShift = useShiftStore((state) => state.activeShift);

    // Only enforce shift for NURSES
    if (user?.role === 'NURSE' && !activeShift) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-yellow-50 rounded-lg border border-yellow-200 m-4">
                <h2 className="text-xl font-bold text-yellow-800 mb-2">No Active Shift</h2>
                <p className="text-yellow-700 mb-4">You must start a shift before accessing patient records.</p>
                <button
                    onClick={() => window.location.href = '/shift'}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                    Go to Shift Management
                </button>
            </div>
        );
    }

    return <>{children}</>;
}
