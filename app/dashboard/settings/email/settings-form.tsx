"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { saveSmtpSettings, testSmtpConnection } from "./actions";
import { Mail, Save, Server, Shield, Send } from "lucide-react";
import { toast } from "sonner";

export function EmailSettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testEmail, setTestEmail] = useState("");

    async function handleSave(formData: FormData) {
        setIsSaving(true);
        try {
            await saveSmtpSettings(formData);
            toast.success("SMTP Settings saved successfully.");
        } catch (error) {
            toast.error("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleTest() {
        if (!testEmail) {
            toast.error("Please enter a test email address.");
            return;
        }
        setIsTesting(true);
        try {
            const res = await testSmtpConnection(testEmail);
            if (res.success) {
                toast.success("Test Email Sent: Please check your inbox.");
            } else {
                toast.error(`Test Failed: ${res.error}`);
            }
        } catch (error: any) {
            toast.error(`Test Failed: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <Card>
                    <form action={handleSave}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5" /> SMTP Configuration</CardTitle>
                            <CardDescription>Enter your email provider's SMTP details (e.g. Gmail, SendGrid, Outlook).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_host">SMTP Host</Label>
                                    <Input id="smtp_host" name="smtp_host" defaultValue={initialSettings["smtp_host"] || "smtp.gmail.com"} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_port">SMTP Port</Label>
                                    <Input id="smtp_port" name="smtp_port" defaultValue={initialSettings["smtp_port"] || "587"} required />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="smtp_from">From Email Address (Sender)</Label>
                                <Input id="smtp_from" name="smtp_from" defaultValue={initialSettings["smtp_from"]} placeholder="noreply@yourcompany.com" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="smtp_user">SMTP Username (Email)</Label>
                                <Input id="smtp_user" name="smtp_user" defaultValue={initialSettings["smtp_user"]} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="smtp_pass" className="flex items-center gap-1"><Shield className="w-4 h-4 text-muted-foreground" /> SMTP Password / App Password</Label>
                                <Input id="smtp_pass" name="smtp_pass" type="password" defaultValue={initialSettings["smtp_pass"]} required />
                                <p className="text-xs text-muted-foreground mt-1">For Gmail, use a 16-character App Password, not your regular account password.</p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Test Configuration</CardTitle>
                        <CardDescription>Send a test email to verify your settings are correct.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="test_email">Send test email to:</Label>
                            <Input 
                                id="test_email" 
                                type="email" 
                                placeholder="you@example.com" 
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button variant="secondary" className="w-full" onClick={handleTest} disabled={isTesting}>
                            {isTesting ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send Test Email</>}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
