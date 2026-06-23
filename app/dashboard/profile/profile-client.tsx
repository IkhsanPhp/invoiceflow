"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2, Eye, EyeOff } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { changePassword } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProfileClientProps {
    user: any;
    recentInvoices?: any[];
}

export function ProfileClient({ user, recentInvoices = [] }: ProfileClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const defaultTab = searchParams.get("tab") || "account";

    const [name, setName] = useState(user.name || "");
    const [jabatan, setJabatan] = useState("");
    const [department, setDepartment] = useState("");
    
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const userInitials = user.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
        : "U";

    const handleTabChange = (value: string) => {
        router.push(`/dashboard/profile?tab=${value}`);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingProfile(true);
        // Simulate profile update for fields not yet in DB
        setTimeout(() => {
            setIsUpdatingProfile(false);
            alert("Profile updated successfully (UI Demo)");
        }, 1000);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess(false);

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }

        setIsChangingPassword(true);
        try {
            const { error } = await changePassword({
                newPassword,
                currentPassword,
                revokeOtherSessions: true,
            });

            if (error) {
                setPasswordError(error.message || "Failed to change password.");
            } else {
                setPasswordSuccess(true);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch (err) {
            setPasswordError("An unexpected error occurred.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Verified":
            case "Paid":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
            case "Needs Revision":
                return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
            case "Pending OCR":
            case "In Review":
            case "Procurement Verified":
            case "In Finance Verification":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            default:
                return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
        }
    };

    return (
        <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-zinc-100 dark:bg-zinc-900 border-b w-full justify-start rounded-none h-12 p-0 space-x-6">
                <TabsTrigger 
                    value="account" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none h-full px-4 font-medium"
                >
                    Account
                </TabsTrigger>
                <TabsTrigger 
                    value="notifications" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none h-full px-4 font-medium"
                >
                    Notifications
                </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-8">
                {/* Profile Information Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your account details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            {/* Photo Upload Section */}
                            <div className="flex items-center gap-6 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                <Avatar className="h-20 w-20 rounded-2xl bg-blue-100 text-blue-600 font-bold text-2xl">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback className="rounded-2xl bg-blue-100 text-blue-600">{userInitials}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Foto Profil</h4>
                                    <p className="text-xs text-zinc-500">Upload foto sendiri, atau biarkan sistem pakai avatar otomatis yang tetap keren di chat.</p>
                                    <Button variant="outline" size="sm" type="button" className="mt-2 h-8">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Foto
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input 
                                        id="name" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="jabatan">Jabatan</Label>
                                    <Input 
                                        id="jabatan" 
                                        value={jabatan} 
                                        onChange={(e) => setJabatan(e.target.value)} 
                                        placeholder="Contoh: Procurement Manager"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input 
                                        id="department" 
                                        value={department} 
                                        onChange={(e) => setDepartment(e.target.value)} 
                                        placeholder="Contoh: Finance"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input 
                                        id="email" 
                                        value={user.email} 
                                        disabled 
                                        className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Your email address cannot be changed.</p>
                                </div>
                            </div>

                            <Button type="submit" disabled={isUpdatingProfile} className="bg-purple-600 hover:bg-purple-700 text-white">
                                {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Profile
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Change Password Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your password to keep your account secure.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            {passwordError && (
                                <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                                    <AlertDescription>{passwordError}</AlertDescription>
                                </Alert>
                            )}
                            {passwordSuccess && (
                                <Alert className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    <AlertDescription>Your password has been changed successfully.</AlertDescription>
                                </Alert>
                            )}
                            
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input 
                                    id="currentPassword" 
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input 
                                    id="newPassword" 
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input 
                                    id="confirmPassword" 
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="pt-2">
                                <Button type="submit" disabled={isChangingPassword} className="bg-rose-600 hover:bg-rose-700 text-white">
                                    {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Change Password
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Invoice Verification History</CardTitle>
                        <CardDescription>View the status updates and history of your submitted invoices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentInvoices.length > 0 ? (
                            <div className="space-y-4">
                                {recentInvoices.map((inv) => (
                                    <div key={inv.id} className="flex items-start justify-between p-4 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <div className="flex gap-4">
                                            <div className="mt-1">
                                                <div className={`w-2 h-2 rounded-full mt-2 ${inv.status === 'Verified' || inv.status === 'Paid' ? 'bg-emerald-500' : inv.status === 'Needs Revision' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium">Invoice {inv.invoiceNumber}</h4>
                                                <p className="text-sm text-zinc-500 mt-1">Status changed to <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>{inv.status}</span></p>
                                                {inv.financeNotes && inv.status === 'Needs Revision' && (
                                                    <p className="text-sm text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-md">
                                                        Note: {inv.financeNotes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-400 whitespace-nowrap">
                                            {new Date(inv.updatedAt).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                                <div className="bg-zinc-200 dark:bg-zinc-800 p-3 rounded-full mb-4">
                                    <AlertCircle className="h-6 w-6 text-zinc-500" />
                                </div>
                                <h3 className="font-medium text-lg mb-1">No notifications yet</h3>
                                <p className="text-sm text-zinc-500 max-w-sm">
                                    You don't have any invoice verification history yet. When your invoices are processed, updates will appear here.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

// Ensure you have lucide-react imported for icons above:
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
