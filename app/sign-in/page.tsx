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
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</CardTitle>
                        <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Please enter your credentials to access your account
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-10 border-slate-300 dark:border-slate-700 focus-visible:ring-blue-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                                    <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
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
                                        className="h-10 pr-10 border-slate-300 dark:border-slate-700 focus-visible:ring-blue-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none"
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

                        <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-6 pb-6">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        New vendor partner?{" "}
                        <Link href="/register-vendor" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            Register here
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}