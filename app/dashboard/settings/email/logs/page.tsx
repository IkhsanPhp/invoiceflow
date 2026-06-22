import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getEmailLogs } from "../actions"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function EmailLogsPage() {
    const logs = await getEmailLogs();

    return (
        <div className="p-4 md:p-6 w-full flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Settings / Email Delivery / <span className="text-blue-600 font-semibold">Logs</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard/settings/email" className="text-slate-400 hover:text-slate-800 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">Email Delivery Logs</h1>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 ml-7">
                        View the history of automated emails sent by the system.
                    </p>
                </div>
            </div>

            <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden transition-all">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="w-full text-sm text-left border-collapse">
                            <TableHeader>
                                <TableRow className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                                    <TableHead className="px-5 py-3 text-left">Date & Time</TableHead>
                                    <TableHead className="px-5 py-3 text-left">Recipient</TableHead>
                                    <TableHead className="px-5 py-3 text-left">Subject</TableHead>
                                    <TableHead className="px-5 py-3 text-left">Status</TableHead>
                                    <TableHead className="px-5 py-3 text-left">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-900">
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-16 text-slate-400 font-medium">
                                            No email logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                            <TableCell className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-medium">
                                                {new Date(log.sentAt).toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                                {log.recipient}
                                            </TableCell>
                                            <TableCell className="px-5 py-3.5 max-w-[300px] truncate">
                                                {log.subject}
                                            </TableCell>
                                            <TableCell className="px-5 py-3.5">
                                                <Badge variant={log.status === "sent" ? "default" : "destructive"} className={log.status === "sent" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-transparent font-semibold shadow-none" : "font-semibold shadow-none"}>
                                                    {log.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-5 py-3.5 text-sm text-red-600 max-w-[250px] truncate" title={log.errorMsg || ""}>
                                                {log.errorMsg || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
