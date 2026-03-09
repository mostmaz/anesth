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
            "w-full min-h-[3rem] h-auto lg:h-12 px-4 py-2 lg:py-0 flex flex-col lg:flex-row lg:items-center justify-between border-b text-xs lg:text-sm font-medium print:hidden gap-2",
            isNight ? "bg-indigo-950 text-indigo-100 border-indigo-900" : "bg-blue-50 text-blue-900 border-blue-100"
        )}>
            <div className="flex items-center justify-between lg:justify-start lg:space-x-4 w-full lg:w-auto">
                <div className="flex items-center space-x-2">
                    {isNight ? <Moon className="w-4 h-4 text-indigo-300" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <span className="font-bold">{isNight ? 'Night Shift' : 'Day Shift'}</span>
                </div>
                <div className="flex items-center space-x-2 opacity-80 lg:border-l lg:border-blue-200 lg:pl-4">
                    <Clock className="w-3 h-3" />
                    <span>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[10px]">({durationHours}h)</span>
                </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end space-x-3 w-full lg:w-auto border-t lg:border-t-0 border-blue-200/30 pt-1 lg:pt-0">
                <div className="flex items-center gap-1.5 truncate">
                    <span className="opacity-75 hidden sm:inline">Nurse:</span>
                    <Badge variant={isNight ? "secondary" : "outline"} className="font-bold py-0 h-5 text-[10px] bg-white/10 border-none">
                        {user.name}
                    </Badge>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => endShift()}
                    className="hover:bg-black/10 hover:text-red-400 h-7 text-[10px] px-2 font-bold uppercase transition-colors"
                >
                    End Shift
                </Button>
            </div>
        </div>
    );
}
