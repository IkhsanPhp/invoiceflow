import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { getSmtpSettings } from "./actions"
import { EmailSettingsForm } from "./settings-form"
import Link from "next/link"

export default async function EmailSettingsPage() {
    const settings = await getSmtpSettings();

    return (
        <div className="p-4 md:p-6 w-full flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Settings / <span className="text-blue-600 font-semibold">Email Delivery</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">Email Delivery Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure SMTP server for sending automated emails.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/settings/email/templates" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200/60 bg-white px-4 py-2 text-sm font-bold shadow-sm transition-colors hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-300">
                        Email Templates
                    </Link>
                    <Link href="/dashboard/settings/email/logs" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200/60 bg-white px-4 py-2 text-sm font-bold shadow-sm transition-colors hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-300">
                        Delivery Logs
                    </Link>
                </div>
            </div>

            <EmailSettingsForm initialSettings={settings} />
        </div>
    );
}
