
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Upload, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';

interface SkinAssessmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    authorId: string;
    bodyPart: string;
    view: 'FRONT' | 'BACK';
    onSuccess: () => void;
}

export default function SkinAssessmentDialog({
    open,
    onOpenChange,
    patientId,
    authorId,
    bodyPart,
    view,
    onSuccess
}: SkinAssessmentDialogProps) {
    const [type, setType] = useState<'LESION' | 'DRESSING'>('LESION');
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiClient.post<{ url: string }>('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            } as any);
            setImageUrl(res.url);
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            await apiClient.post('/skin', {
                patientId,
                authorId,
                bodyPart,
                view,
                type,
                imageUrl,
                notes
            });
            toast.success("Assessment saved");
            onSuccess();
            onOpenChange(false);
            // Reset form
            setNotes('');
            setImageUrl(null);
            setType('LESION');
        } catch (error) {
            console.error(error);
            toast.error("Failed to save assessment");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Skin Assessment: {bodyPart} ({view})</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="type">Assessment Type</Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LESION">Lesion / Pressure Injury</SelectItem>
                                <SelectItem value="DRESSING">Dressing / Bandage</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Clinical Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Describe appearance, size, or dressing state..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Image (Optional)</Label>
                        {imageUrl ? (
                            <div className="relative group rounded-lg overflow-hidden border">
                                <img src={imageUrl} alt="Skin assessment" className="w-full h-32 object-cover" />
                                <button
                                    onClick={() => setImageUrl(null)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                <div className="text-center">
                                    {uploading ? (
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                            <span className="text-xs text-slate-500">Upload Lesion Image</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={uploading}>Save Assessment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
