
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Users, Pill, UserPlus } from 'lucide-react';

import UserManagementTab from '../features/admin/UserManagementTab';
import DrugCatalogTab from '../features/admin/DrugCatalogTab';
import NurseAssignmentTab from '../features/admin/NurseAssignmentTab';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState('users');

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Panel</h1>
                <p className="text-slate-500">Manage users, medications, and staff assignments.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" /> User Management
                    </TabsTrigger>
                    <TabsTrigger value="drugs" className="gap-2">
                        <Pill className="w-4 h-4" /> Drug Catalog
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="gap-2">
                        <UserPlus className="w-4 h-4" /> Nurse Assignments
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>Create and manage system access for staff.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserManagementTab />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="drugs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Drug Catalog</CardTitle>
                            <CardDescription>Manage common medications for rapid prescribing.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DrugCatalogTab />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assignments" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Nurse Assignments</CardTitle>
                            <CardDescription>Assign nurses to patients for the current shift.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NurseAssignmentTab />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
