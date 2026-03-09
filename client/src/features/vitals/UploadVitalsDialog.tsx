import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, Upload, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { uploadApi } from '@/api/uploadApi';

interface UploadVitalsDialogProps {
    onVitalsExtracted: (data: { hr?: string; bpSys?: string; bpDia?: string; spo2?: string; temp?: string; rr?: string; imageUrl?: string }) => void;
}

export function UploadVitalsDialog({ onVitalsExtracted }: UploadVitalsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string>('');
    const { user } = useAuthStore();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error("You must be logged in to upload results");
            return;
        }

        if (!selectedFile) {
            toast.error("Please select an image file first.");
            return;
        }

        setIsLoading(true);
        setProcessingStatus('Uploading monitor image...');

        try {
            // 1. Upload the image
            let uploadedFiles;
            try {
                uploadedFiles = await uploadApi.uploadImages([selectedFile]);
            } catch (err) {
                console.error("Upload failed", err);
                toast.error("Failed to upload image");
                setIsLoading(false);
                return;
            }

            if (!uploadedFiles || uploadedFiles.length === 0) {
                throw new Error("No file returned from upload");
            }

            const fileData = uploadedFiles[0];
            setProcessingStatus('Analyzing vital signs with AI...');

            // 2. Analyze with AI (VITALS mode)
            let analysisResult: any = {};
            try {
                analysisResult = await uploadApi.analyzeImage(fileData.url, 'VITALS');
            } catch (err) {
                console.error(`AI Analysis failed`, err);
                toast.error(`Could not read vitals from image. Please enter manually.`);
                setIsLoading(false);
                setIsOpen(false);
                return;
            }

            if (analysisResult) {
                toast.success("Vitals successfully extracted from image!");
                onVitalsExtracted({
                    hr: analysisResult.hr?.toString() || '',
                    bpSys: analysisResult.bpSys?.toString() || '',
                    bpDia: analysisResult.bpDia?.toString() || '',
                    spo2: analysisResult.spo2?.toString() || '',
                    temp: analysisResult.temp?.toString() || '',
                    imageUrl: fileData.url, // Pass image URL up
                });
            } else {
                toast.warning("No clear vitals detected in the image. Uploading for reference.");
                onVitalsExtracted({
                    imageUrl: fileData.url, // Still pass URL even if OCR failed
                });
            }

            setIsOpen(false);
            setSelectedFile(null);

        } catch (error) {
            console.error("API Error in handleSubmit:", error);
            toast.error("Failed to process vitals image");
        } finally {
            setIsLoading(false);
            setProcessingStatus('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" type="button" className="gap-2 border-primary/50 text-primary hover:bg-primary/5">
                    <ScanLine className="h-4 w-4" />
                    Scan Monitor
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Scan Patient Monitor</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-4 border p-4 rounded-md bg-slate-50">
                        <div className="space-y-2">
                            <Label htmlFor="vitals-file">Select Monitor Photo</Label>
                            <Input
                                id="vitals-file"
                                type="file"
                                accept="image/*"
                                required
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setSelectedFile(e.target.files[0]);
                                    }
                                }}
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vitals-camera">Or Take a Photo (Mobile)</Label>
                            <Input
                                id="vitals-camera"
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setSelectedFile(e.target.files[0]);
                                    }
                                }}
                                className="bg-white"
                            />
                        </div>
                        <div className="text-xs text-slate-500">
                            <p>Upload a clear photo of the patient monitor to automatically extract:</p>
                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                <li>Heart Rate</li>
                                <li>Blood Pressure (NIBP/ART)</li>
                                <li>SpO2</li>
                                <li>Temperature</li>
                            </ul>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="gap-2">
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {processingStatus}
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Upload & Scan
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
