
import { useEffect, useState } from 'react';
import { ordersApi, ClinicalOrder } from '../../api/ordersApi';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useAuthStore } from '../../stores/authStore';
import { CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import CreateOrderDialog from './CreateOrderDialog';

interface OrdersTabProps {
    patientId: string;
}

export default function OrdersTab({ patientId }: OrdersTabProps) {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<ClinicalOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await ordersApi.getOrders(patientId);
            setOrders(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientId) fetchOrders();
    }, [patientId]);

    if (loading && orders.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Loading orders...</div>;
    }

    const handleStatusUpdate = async (orderId: string, status: 'APPROVED' | 'DISCONTINUED' | 'COMPLETED') => {
        if (!user) return;
        try {
            await ordersApi.updateStatus(orderId, status, user.id);
            toast.success(`Order ${status.toLowerCase()}`);
            fetchOrders();
        } catch (error: any) {
            toast.error(error.message || "Failed to update order");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'DISCONTINUED': return 'bg-gray-100 text-gray-500 border-gray-200';
            default: return 'bg-slate-100';
        }
    };

    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    const activeOrders = orders.filter(o => o.status === 'APPROVED');
    const historyOrders = orders.filter(o => ['COMPLETED', 'DISCONTINUED'].includes(o.status));

    const OrderCard = ({ order }: { order: ClinicalOrder }) => (
        <Card className="mb-3 hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            {order.type}
                        </Badge>
                        {order.priority !== 'ROUTINE' && (
                            <Badge variant="destructive" className="text-xs">
                                {order.priority}
                            </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(order.createdAt).toLocaleString()}
                        </span>
                    </div>
                    <h4 className="font-semibold text-lg text-slate-800">{order.title}</h4>
                    {order.details?.info && <p className="text-sm text-slate-600 mt-1">{order.details.info}</p>}
                    {order.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {order.notes}</p>}

                    <div className="mt-2 text-xs text-slate-500">
                        Ordered by: <span className="font-medium">{order.author.name}</span> ({order.author.role})
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {order.status === 'PENDING' && user?.role === 'SENIOR' && (
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleStatusUpdate(order.id, 'APPROVED')}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
                    )}
                    {(order.status === 'PENDING' || order.status === 'APPROVED') && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusUpdate(order.id, 'DISCONTINUED')}
                        >
                            <XCircle className="w-4 h-4 mr-1" /> Discontinue
                        </Button>
                    )}
                    {order.status === 'APPROVED' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                        >
                            <FileText className="w-4 h-4 mr-1" /> Complete
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Order Management</h3>
                    <p className="text-sm text-muted-foreground">Review and manage clinical orders</p>
                </div>
                {user?.role === 'SENIOR' && (
                    <CreateOrderDialog patientId={patientId} onOrderCreated={fetchOrders} />
                )}
            </div>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="active" className="relative">
                        Active
                        <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800 h-5 px-1.5">{activeOrders.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                        Pending
                        {pendingOrders.length > 0 && (
                            <Badge variant="destructive" className="ml-2 h-5 px-1.5 animate-pulse">{pendingOrders.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4 space-y-4">
                    {activeOrders.length === 0 ? <div className="text-center p-8 text-muted-foreground">No active orders</div> : activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </TabsContent>

                <TabsContent value="pending" className="mt-4 space-y-4">
                    {pendingOrders.length === 0 ? <div className="text-center p-8 text-muted-foreground">No pending orders</div> : pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </TabsContent>

                <TabsContent value="history" className="mt-4 space-y-4">
                    {historyOrders.length === 0 ? <div className="text-center p-8 text-muted-foreground">No history</div> : historyOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </TabsContent>
            </Tabs>
        </div >
    );
}
