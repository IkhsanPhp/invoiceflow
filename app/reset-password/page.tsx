"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetPassword } from "@/lib/auth-client";
import { Loader2, Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordForm() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 4) {
            setError("Password must be at least 4 characters long.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const { error: resetError } = await resetPassword({
                newPassword,
                token
            });

            if (resetError) {
                setError(resetError.message || "Failed to reset password.");
            } else {
                setIsSuccess(true);
                setTimeout(() => {
                    router.push("/sign-in");
                }, 3000);
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="space-y-6 text-center py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                    <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Password reset complete!</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Your password has been successfully reset. Redirecting you to the sign in page...
                    </p>
                </div>
                <Button 
                    onClick={() => router.push("/sign-in")} 
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                    Sign in now
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300">New Password</Label>
                    <div className="relative">
                        <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-10 pr-10 border-slate-300 dark:border-slate-700 focus-visible:ring-blue-600"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none"
                        >
                            {showNewPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-10 pr-10 border-slate-300 dark:border-slate-700 focus-visible:ring-blue-600"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none"
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium" disabled={isLoading || !token}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting password...
                    </>
                ) : (
                    "Reset password"
                )}
            </Button>
            
            {!token && (
                <div className="text-center text-sm text-red-600 mt-2">
                    Missing reset token. Please use the link from your email.
                </div>
            )}
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="w-full max-w-[400px] shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="flex items-center justify-center gap-2 font-bold text-2xl">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-slate-900 dark:text-white">InvoiceFlow</span>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create new password</CardTitle>
                        <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Your new password must be different from previous used passwords.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
