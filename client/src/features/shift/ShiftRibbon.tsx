import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { Moon, Sun, Clock } from 'lucide-react';

export default function ShiftRibbon() {
    const user = useAuthStore((state) => state.user);
    const { activeShift, endShift } = useShiftStore();

    if (user?.role !== 'NURSE' || !activeShift) return null;

    const isNight = activeShift.type === 'NIGHT';
    const startTime = new Date(activeShift.startTime);

    // Calculate duration (mock for now, ideally use a hook to update every minute)
    const durationHours = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60));

    return (
        <div className={cn(
            "w-full h-12 px-4 flex items-center justify-between border-b text-sm font-medium",
            isNight ? "bg-indigo-950 text-indigo-100 border-indigo-900" : "bg-blue-50 text-blue-900 border-blue-100"
        )}>
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    {isNight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    <span>{isNight ? 'Night Shift' : 'Day Shift'}</span>
                </div>
                <div className="flex items-center space-x-2 opacity-80">
                    <Clock className="w-3 h-3" />
                    <span>Started at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>({durationHours}h active)</span>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                <span className="opacity-75">assigned to</span>
                <Badge variant={isNight ? "secondary" : "outline"} className="font-bold">
                    {user.name}
                </Badge>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => endShift()}
                    className="ml-2 hover:bg-black/10 hover:text-red-400 h-8 text-xs"
                >
                    End Shift
                </Button>
            </div>
        </div>
    );
}
