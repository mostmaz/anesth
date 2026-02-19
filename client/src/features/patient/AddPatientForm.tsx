import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

interface AddPatientFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AddPatientForm({ onSuccess, onCancel }: AddPatientFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        mrn: '',
        age: '',
        ageUnit: 'Years',
        gender: 'Male',
        diagnosis: '',
        comorbidities: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.name || !formData.mrn || !formData.age) {
                throw new Error('Please fill in all required fields.');
            }

            // Calculate DOB from Age
            const ageVal = parseInt(formData.age);
            const today = new Date();
            let dobDate = new Date();

            if (formData.ageUnit === 'Years') {
                dobDate.setFullYear(today.getFullYear() - ageVal);
            } else if (formData.ageUnit === 'Months') {
                dobDate.setMonth(today.getMonth() - ageVal);
            } else { // Days
                dobDate.setDate(today.getDate() - ageVal);
            }

            const payload = {
                name: formData.name,
                mrn: formData.mrn,
                dob: dobDate.toISOString(),
                gender: formData.gender,
                diagnosis: formData.diagnosis,
                comorbidities: formData.comorbidities.split(',').map(s => s.trim()).filter(Boolean),
                authorId: useAuthStore.getState().user?.id
            };

            await apiClient.post('/patients', payload);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to add patient.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-slate-800">New Patient Registration</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Patient Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Mustafa Mazin Mohammed"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">MRN</label>
                    <input
                        type="text"
                        name="mrn"
                        value={formData.mrn}
                        onChange={handleChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Age</label>
                        <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            placeholder="e.g. 45"
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            required
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Unit</label>
                        <select
                            name="ageUnit"
                            value={formData.ageUnit}
                            onChange={handleChange}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="Years">Years</option>
                            <option value="Months">Months</option>
                            <option value="Days">Days</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Diagnosis</label>
                    <input
                        type="text"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        placeholder="e.g. Septic Shock, Pneumonia"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Comorbidities (comma separated)</label>
                    <textarea
                        name="comorbidities"
                        value={formData.comorbidities}
                        onChange={handleChange}
                        placeholder="e.g. HTN, T2DM, COPD"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        rows={2}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Patient'}
                    </button>
                </div>
            </form>
        </div>
    );
}
