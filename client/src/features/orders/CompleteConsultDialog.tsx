
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { patientApi } from '../../api/patientApi';
import { uploadApi } from '../../api/uploadApi';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';

interface CompleteConsultDialogProps {
    isOpen: boolean;
    onClose: () => void;
    order: {
        id: string;
        patientId: string;
        title: string;
    };
    onSuccess: () => void;
}

export default function CompleteConsultDialog({ isOpen, onClose, order, onSuccess }: CompleteConsultDialogProps) {
    const user = useAuthStore(state => state.user);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [result, setResult] = useState({
        doctorName: '',
        specialty: order.title.replace('Consultation: ', '').replace('Consult: ', ''),
        notes: '',
        imageUrl: ''
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const uploaded = await uploadApi.uploadImages([file]);
            setResult({ ...result, imageUrl: uploaded[0].url });
            toast.success("File uploaded successfully");
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        if (!result.doctorName || !result.specialty) {
            toast.error("Please fill doctor name and specialty");
            return;
        }

        setIsSubmitting(true);
        try {
            await patientApi.addConsultation(order.patientId, {
                ...result,
                authorId: user.id,
                orderId: order.id
            });
            toast.success("Consultation completed and saved");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to complete consultation", error);
            toast.error("Failed to complete consultation");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Complete Consultation Result</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Consultant Name</Label>
                        <Input
                            placeholder="Dr. Name"
                            value={result.doctorName}
                            onChange={e => setResult({ ...result, doctorName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Specialty</Label>
                        <Input
                            placeholder="e.g. Cardiology"
                            value={result.specialty}
                            onChange={e => setResult({ ...result, specialty: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Notes / Recommendation</Label>
                        <textarea
                            className="w-full h-32 p-3 bg-slate-50 border rounded-lg text-sm"
                            placeholder="Enter consultant's notes..."
                            value={result.notes}
                            onChange={e => setResult({ ...result, notes: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Report Image / PDF</Label>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*,application/pdf"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${result.imageUrl ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-blue-400'
                                }`}
                        >
                            {uploading ? (
                                <Loader2 className="w-8 h-8 text-blue-400 mx-auto animate-spin" />
                            ) : (
                                <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${result.imageUrl ? 'text-green-500' : 'text-slate-400'}`} />
                            )}
                            <p className="text-xs text-slate-500">
                                {uploading ? 'Uploading...' : result.imageUrl ? 'File uploaded!' : 'Click to upload report'}
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSubmitting || uploading}>
                        {isSubmitting ? 'Saving...' : 'Complete & Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
