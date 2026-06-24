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
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Forgot password?</CardTitle>
                        <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Enter your email address and we'll send you a link to reset your password.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    {isSuccess ? (
                        <div className="space-y-6 text-center py-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                                <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Check your email</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                    We sent a password reset link to <br/><span className="font-semibold text-slate-900 dark:text-white">{email}</span>
                                </p>
                            </div>
                            <Button 
                                onClick={() => router.push("/sign-in")} 
                                variant="outline" 
                                className="w-full h-10 border-slate-300 dark:border-slate-700 font-medium"
                            >
                                Back to Sign in
                            </Button>
                        </div>
                    ) : (
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
                            </div>

                            <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending link...
                                    </>
                                ) : (
                                    "Send reset link"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
                
                {!isSuccess && (
                    <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-6 pb-6">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Remember your password?{" "}
                            <Link href="/sign-in" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                                Sign in
                            </Link>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
