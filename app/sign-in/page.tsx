"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn, signOut } from "@/lib/auth-client";
import { Loader2, Eye, EyeOff, Building2 } from "lucide-react";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const err = params.get("error");
            if (err === "pending_verification") {
                setError("Pendaftaran akun vendor Anda sedang dalam proses verifikasi oleh tim Procurement. Anda baru dapat mengakses dashboard setelah verifikasi selesai.");
                signOut().catch((e) => console.error("Sign out error:", e));
            } else if (err === "unauthorized") {
                setError("Akses ditolak. Silakan login kembali.");
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.email({
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message || "Sign in failed");
            } else {
                router.push("/dashboard");
            }
        } catch {
            setError("An unexpected error occurred");
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
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Streamline Your Vendor Operations</h1>
                    <p className="text-lg text-zinc-400">The most efficient way to manage invoices, verifications, and payments. Secure, fast, and fully automated.</p>
                </div>
                
                <div className="relative z-10 text-sm text-zinc-500">
                    &copy; 2026 Chitra Paratama. All rights reserved.
                </div>
            </div>

            {/* Right side - Login Form */}
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <div className="lg:hidden flex items-center justify-center gap-2 font-bold text-3xl mb-8">
                            <div className="bg-emerald-500 p-2 rounded-lg">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            InvoiceFlow
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Welcome back</h2>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Please enter your credentials to access your account
                        </p>
                    </div>

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
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link href="/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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

                        <Button type="submit" className="w-full h-11 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                        
                        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                            Are you a new vendor partner?{" "}
                            <Link href="/register-vendor" className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                                Self-Register here
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}