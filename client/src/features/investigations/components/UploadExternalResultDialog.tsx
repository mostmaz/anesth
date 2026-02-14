
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { investigationsApi } from '@/api/investigationsApi';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadApi } from '@/api/uploadApi';

interface UploadExternalResultDialogProps {
    patientId: string;
    onSuccess?: () => void;
}

export function UploadExternalResultDialog({ patientId, onSuccess }: UploadExternalResultDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string>('');
    const { user } = useAuthStore();

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    // Minimal form data, mostly handled by AI now
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        impression: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("handleSubmit called");

        if (!user?.id) {
            toast.error("You must be logged in to upload results");
            return;
        }

        setIsLoading(true);
        setProcessingStatus('Starting...');

        try {
            // MODE: FILE UPLOAD (BATCH)
            if (selectedFiles.length > 0) {

                // 1. Upload all files at once
                setProcessingStatus(`Uploading ${selectedFiles.length} files...`);
                let uploadedFiles: { url: string; filename: string; originalName: string }[] = [];

                try {
                    uploadedFiles = await uploadApi.uploadImages(selectedFiles);
                } catch (err) {
                    console.error("Batch upload failed", err);
                    toast.error("Failed to upload files");
                    setIsLoading(false);
                    return;
                }

                let completed = 0;
                const total = uploadedFiles.length;

                // 2. Process each uploaded file
                for (const fileData of uploadedFiles) {
                    setProcessingStatus(`Analyzing ${completed + 1} of ${total}: ${fileData.originalName}...`);

                    try {
                        const imageUrl = fileData.url;

                        // 3. Analyze with AI
                        let analysisResults: any[] = [];
                        try {
                            const aiResponse = await uploadApi.analyzeImage(imageUrl);
                            // Ensure we have an array
                            if (Array.isArray(aiResponse)) {
                                analysisResults = aiResponse;
                            } else if (aiResponse) {
                                analysisResults = [aiResponse];
                            }
                        } catch (err) {
                            console.error(`AI Analysis failed for ${fileData.originalName}`, err);
                            toast.error(`AI Analysis failed for ${fileData.originalName}, saving as generic result.`);
                            // Fallback to generic result
                            analysisResults = [{
                                type: 'LAB',
                                category: 'External',
                                title: fileData.originalName,
                                results: { note: "AI Analysis Failed" }
                            }];
                        }

                        // 4. Create investigations for each result found in the file
                        for (const item of analysisResults) {
                            const resultData = {
                                ...item.results, // Expand the results object
                                imageUrl: imageUrl, // Attach the image to every derived investigation
                                text: JSON.stringify(item.results) // Backup text
                            };

                            let conductedAt = new Date(formData.date).toISOString();
                            if (item.date) {
                                const parsedDate = new Date(item.date);
                                if (!isNaN(parsedDate.getTime())) {
                                    conductedAt = parsedDate.toISOString();
                                }
                            }

                            await investigationsApi.create({
                                patientId,
                                authorId: user.id,
                                type: (item.type || 'LAB') as 'LAB' | 'IMAGING',
                                category: item.category || 'External',
                                title: item.title || fileData.originalName,
                                status: 'FINAL',
                                result: resultData,
                                impression: formData.impression,
                                conductedAt: conductedAt,
                            });
                        }

                    } catch (processErr) {
                        console.error(`Failed to process file ${fileData.originalName}`, processErr);
                        toast.error(`Failed to process ${fileData.originalName}`);
                    }
                    completed++;
                }

                toast.success(`Processed ${completed} files.`);
                setIsOpen(false);
                setSelectedFiles([]);
                if (onSuccess) onSuccess();

            } else {
                toast.error("Please select at least one file.");
            }

        } catch (error) {
            console.error("API Error in handleSubmit:", error);
            toast.error("Failed to upload external result");
        } finally {
            setIsLoading(false);
            setProcessingStatus('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload External Result
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload External Result</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Common Date Field */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date Conducted</Label>
                        <Input
                            id="date"
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div className="space-y-4 border p-3 rounded-md">
                        <Label className="mb-2 block font-medium">Upload Images</Label>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="file">Select Images (Max 3)</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    required
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            const files = Array.from(e.target.files).slice(0, 3);
                                            setSelectedFiles(files);
                                        }
                                    }}
                                />
                                {selectedFiles.length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        <p className="font-medium mb-1">Selected Files:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {selectedFiles.map((file, idx) => (
                                                <li key={idx}>{file.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-blue-50 text-xs text-blue-700 rounded border border-blue-100">
                                <p className="font-semibold mb-1">AI Analysis Enabled</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Automatically detects Test Name, Type (Lab/Imaging), and Date.</li>
                                    <li>Extracts numerical results and text findings.</li>
                                    <li>Multi-page or multi-test reports are supported.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? processingStatus : "Upload"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
