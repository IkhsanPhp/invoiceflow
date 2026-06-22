import { getEmailTemplates } from "../actions"
import { TemplatesClient } from "./template-client"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function EmailTemplatesPage() {
    const templates = await getEmailTemplates();

    return (
        <div className="p-4 md:p-6 w-full flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Settings / Email Delivery / <span className="text-blue-600 font-semibold">Templates</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard/settings/email" className="text-slate-400 hover:text-slate-800 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">Email Templates</h1>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 ml-7">
                        Manage subjects and message content for automated emails.
                    </p>
                </div>
            </div>

            <TemplatesClient initialTemplates={templates} />
        </div>
    );
}
