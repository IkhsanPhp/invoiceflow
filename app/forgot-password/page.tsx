"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forgetPassword } from "@/lib/auth-client";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setIsSuccess(false);

        try {
            const { error: resetError } = await forgetPassword({
                email,
                redirectTo: "/reset-password",
            });

            if (resetError) {
                setError(resetError.message || "Failed to send password reset email.");
            } else {
                setIsSuccess(true);
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

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
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Reset Your Password</h1>
                    <p className="text-lg text-zinc-400">Secure access to your vendor portal and invoices.</p>
                </div>
                
                <div className="relative z-10 text-sm text-zinc-500">
                    &copy; 2026 Chitra Paratama. All rights reserved.
                </div>
            </div>

            {/* Right side - Forgot Password Form */}
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <div className="lg:hidden flex items-center justify-center gap-2 font-bold text-3xl mb-8">
                            <div className="bg-emerald-500 p-2 rounded-lg">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            InvoiceFlow
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Forgot password?</h2>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    {isSuccess ? (
                        <div className="mt-8 space-y-6 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-medium text-zinc-900 dark:text-white">Check your email</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                We sent a password reset link to <br/><span className="font-semibold text-zinc-900 dark:text-white">{email}</span>
                            </p>
                            <Button 
                                onClick={() => router.push("/sign-in")} 
                                variant="outline" 
                                className="w-full h-11 text-base font-medium"
                            >
                                Back to Sign in
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            {error && (
                                <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Sending link...
                                    </>
                                ) : (
                                    "Send reset link"
                                )}
                            </Button>
                            
                            <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                                Remember your password?{" "}
                                <Link href="/sign-in" className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                                    Sign in
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
