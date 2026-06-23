"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetPassword } from "@/lib/auth-client";
import { Loader2, Eye, EyeOff, Building2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
            <div className="mt-8 space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-medium text-zinc-900 dark:text-white">Password reset complete!</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                    Your password has been successfully reset. Redirecting you to the sign in page...
                </p>
                <Button 
                    onClick={() => router.push("/sign-in")} 
                    className="w-full h-11 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    Sign in now
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                        <Input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-11 pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 focus:outline-none"
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" aria-hidden="true" />
                            ) : (
                                <Eye className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-11 pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 focus:outline-none"
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" aria-hidden="true" />
                            ) : (
                                <Eye className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading || !token}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Resetting password...
                    </>
                ) : (
                    "Reset password"
                )}
            </Button>
            
            {!token && (
                <div className="text-center text-sm text-red-500 mt-2">
                    Missing reset token. Please use the link from your email.
                </div>
            )}
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen w-full flex">
            {/* Left side - Branding/Hero */}
            <div className="hidden lg:flex flex-1 flex-col justify-between bg-zinc-900 p-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-zinc-900 z-0"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-luminosity z-0"></div>
                
                <div className="relative z-10 flex items-center gap-2 font-bold text-2xl">
                    <div className="bg-emerald-500 p-2 rounded-lg">
                        <Building2 className="h-6 w-6 text-white" />
                    </div>
                    InvoiceFlow
                </div>
                
                <div className="relative z-10 max-w-lg">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Set New Password</h1>
                    <p className="text-lg text-zinc-400">Choose a strong password to keep your account secure.</p>
                </div>
                
                <div className="relative z-10 text-sm text-zinc-500">
                    &copy; 2026 Chitra Paratama. All rights reserved.
                </div>
            </div>

            {/* Right side - Reset Password Form */}
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <div className="lg:hidden flex items-center justify-center gap-2 font-bold text-3xl mb-8">
                            <div className="bg-emerald-500 p-2 rounded-lg">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            InvoiceFlow
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Create new password</h2>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Your new password must be different from previous used passwords.
                        </p>
                    </div>

                    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
