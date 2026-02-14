
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ordersApi, OrderType, Priority } from '../../api/ordersApi';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface CreateOrderDialogProps {
    patientId: string;
    onOrderCreated: () => void;
}

export default function CreateOrderDialog({ patientId, onOrderCreated }: CreateOrderDialogProps) {
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<OrderType>('MEDICATION');
    const [priority, setPriority] = useState<Priority>('ROUTINE');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [details, setDetails] = useState('');

    const handleSubmit = async () => {
        if (!user) return;
        if (!title) {
            toast.error("Order title is required");
            return;
        }

        try {
            await ordersApi.createOrder({
                patientId,
                authorId: user.id,
                type,
                title,
                priority,
                notes,
                details: { info: details }
            });
            toast.success("Order placed successfully");
            setOpen(false);
            onOrderCreated();
            setTitle('');
            setNotes('');
            setDetails('');
        } catch (error) {
            toast.error("Failed to place order");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> New Order
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Clinical Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MEDICATION">Medication</SelectItem>
                                    <SelectItem value="LAB">Lab Test</SelectItem>
                                    <SelectItem value="IMAGING">Imaging</SelectItem>
                                    <SelectItem value="NURSING">Nursing Care</SelectItem>
                                    <SelectItem value="DIET">Diet</SelectItem>
                                    <SelectItem value="CONSULT">Consult</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ROUTINE">Routine</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                    <SelectItem value="STAT">STAT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Order Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={type === 'MEDICATION' ? "e.g., Ceftriaxone 2g IV Daily" : "e.g., CBC, CXR"}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Details / Instructions</Label>
                        <Textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Specific dosing, lateralities, or protocols..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Clinical Notes (Optional)</Label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Reason for order..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Place Order</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
