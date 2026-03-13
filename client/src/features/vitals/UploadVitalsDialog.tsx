import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, Upload, ScanLine, Camera, ImagePlus, X } from 'lucide-react';
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
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleClearImage = () => {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!user?.id) {
            toast.error("You must be logged in to upload results");
            return;
        }
        if (!selectedFile) {
            toast.error("Please capture or select an image first.");
            return;
        }

        setIsLoading(true);
        setProcessingStatus('Uploading monitor image...');

        try {
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
                    imageUrl: fileData.url,
                });
            } else {
                toast.warning("No clear vitals detected. Uploading image for reference.");
                onVitalsExtracted({ imageUrl: fileData.url });
            }

            handleClearImage();
            setIsOpen(false);
        } catch (error) {
            console.error("API Error:", error);
            toast.error("Failed to process vitals image");
        } finally {
            setIsLoading(false);
            setProcessingStatus('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) handleClearImage(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" type="button" className="gap-2 border-primary/50 text-primary hover:bg-primary/5">
                    <ScanLine className="h-4 w-4" />
                    Scan Monitor
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Scan Patient Monitor</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Hidden inputs */}
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                    />

                    {!previewUrl ? (
                        /* Capture options */
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-blue-700 text-base">Take Photo</p>
                                    <p className="text-xs text-blue-500 mt-0.5">Point camera at patient monitor</p>
                                </div>
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 font-medium">or</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-slate-600 text-sm font-medium"
                            >
                                <ImagePlus className="w-4 h-4" />
                                Choose from Gallery
                            </button>

                            <p className="text-xs text-slate-400 text-center">
                                AI will automatically extract HR, BP, SpO2, Temp, RR
                            </p>
                        </div>
                    ) : (
                        /* Image preview + confirm */
                        <div className="space-y-3">
                            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black">
                                <img src={previewUrl} alt="Monitor preview" className="w-full max-h-56 object-contain" />
                                <button
                                    type="button"
                                    onClick={handleClearImage}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <ScanLine className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>AI will analyze this image and extract vitals automatically</span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    {previewUrl && (
                        <Button type="button" onClick={handleSubmit} disabled={isLoading} className="gap-2">
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {processingStatus}
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Analyze & Fill
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
