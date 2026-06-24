"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/lib/auth-client";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

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
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <Card className="w-full max-w-[1000px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-0 flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-[2rem] p-3 md:p-4 gap-4 md:gap-0">
                
                {/* Left side - Branding Area */}
                <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-400 p-10 flex-col justify-between text-white relative rounded-[1.5rem] overflow-hidden">
                    <div className="relative z-10">
                        <Image 
                            src="/logo-chitra.png" 
                            alt="Chitra Paratama" 
                            width={160} 
                            height={60} 
                            className="object-contain brightness-0 invert"
                            priority
                        />
                    </div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold leading-tight tracking-tight">
                            Empowering Procurement Through Digital Synergy.
                        </h1>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-900 opacity-20 rounded-full blur-2xl mix-blend-overlay"></div>
                </div>

                {/* Right side - Form Area */}
                <div className="w-full md:w-[55%] flex flex-col justify-center p-6 md:p-10 lg:px-14">
                    <div className="mb-8">
                        <div className="md:hidden mb-6 flex justify-center">
                            <Image 
                                src="/logo-chitra.png" 
                                alt="Chitra Paratama" 
                                width={140} 
                                height={50} 
                                className="object-contain"
                            />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">PROC-SHARE</h2>
                        <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-3">All In One Vendor Portal</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Manage invoices, track payments, and monitor supply chain performance from a single dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="vendor@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-blue-600 transition-all"
                                />
                                <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                                    Gunakan email terdaftar Anda untuk masuk ke sistem PROC-SHARE.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-12 px-4 pr-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-blue-600 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>
                    
                    <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <Button asChild variant="outline" className="flex-1 h-11 rounded-xl border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <Link href="/register-vendor">Daftar Vendor Baru</Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1 h-11 rounded-xl border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <Link href="/forgot-password">Reset Password</Link>
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}