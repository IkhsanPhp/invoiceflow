const fs = require('fs');

// 1. Update app/dashboard/invoice-hub/page.tsx
const pagePath = 'app/dashboard/invoice-hub/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

const oldButton = '<Button size="icon" variant="ghost" onClick={() => alert("Fitur edit invoice sedang dalam pengembangan.")} className="h-7 w-7 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" title="Edit Invoice">';
const newButton = `<Link href={\`/dashboard/invoice-hub/verify/\${inv.id}?mode=edit\`}>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" title="Edit Invoice">`;

pageCode = pageCode.replace(oldButton, newButton);
pageCode = pageCode.replace('                                                            <Edit2 className="h-4 w-4" />\n                                                        </Button>', '                                                            <Edit2 className="h-4 w-4" />\n                                                        </Button>\n                                                    </Link>');
fs.writeFileSync(pagePath, pageCode);


// 2. Update actions.ts
const actionPath = 'app/dashboard/invoice-hub/actions.ts';
let actionCode = fs.readFileSync(actionPath, 'utf8');

actionCode = actionCode.replace(
    'finalDecision: "Verified" | "Needs Revision" | "Rejected" | "Needs Finance Revision"',
    'finalDecision: string'
);
fs.writeFileSync(actionPath, actionCode);


// 3. Update verify/[id]/page.tsx
const verifyPath = 'app/dashboard/invoice-hub/verify/[id]/page.tsx';
let verifyCode = fs.readFileSync(verifyPath, 'utf8');

// Add states
verifyCode = verifyCode.replace(
    'const [errorMsg, setErrorMsg] = useState<string | null>(null);',
    `const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setIsEditMode(params.get('mode') === 'edit');
        }
    }, []);`
);

// Add initialization of overrideStatus
verifyCode = verifyCode.replace(
    'setVerifyTotal(data.invoice.totalAmount?.toString() || "");',
    `setVerifyTotal(data.invoice.totalAmount?.toString() || "");
                setOverrideStatus(data.invoice.status);`
);

// Replace executeVerifySubmit signature to accept string
verifyCode = verifyCode.replace(
    'const executeVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected", skipRedirect: boolean = false) => {',
    'const executeVerifySubmit = async (decision: string, skipRedirect: boolean = false) => {'
);

// Add the Edit Mode Footer
const oldFooter = '{/* Bottom Decisions Actions Footer */}\n                    {role === "finance" ? (';
const newFooter = `{/* Bottom Decisions Actions Footer */}
                    {isEditMode ? (
                        <div className="flex flex-col gap-2.5 mt-2 border-t pt-4 shrink-0">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Pilih Status Baru (Admin Override)</Label>
                            <select 
                                value={overrideStatus}
                                onChange={(e) => setOverrideStatus(e.target.value)}
                                className="text-xs rounded-lg border-slate-300 w-full p-2 bg-white dark:bg-slate-950 border"
                            >
                                <option value="Pending OCR">Pending OCR</option>
                                <option value="In Review">In Review (Siap Diverifikasi)</option>
                                <option value="Procurement Verified">Procurement Verified</option>
                                <option value="In Finance Verification">In Finance Verification</option>
                                <option value="Verified">Verified / Selesai</option>
                                <option value="Needs Revision">Needs Revision</option>
                                <option value="Needs Finance Revision">Needs Finance Revision</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Document in Transit">Document in Transit</option>
                                <option value="Paid">Paid</option>
                            </select>
                            <Button 
                                type="button"
                                onClick={() => executeVerifySubmit(overrideStatus)} 
                                disabled={savingVerification} 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {savingVerification ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan Perubahan...</>
                                ) : (
                                    <><Edit2 className="h-4 w-4" /> Simpan Perubahan Data & Status</>
                                )}
                            </Button>
                        </div>
                    ) : role === "finance" ? (`

verifyCode = verifyCode.replace(oldFooter, newFooter);

fs.writeFileSync(verifyPath, verifyCode);

console.log("Successfully implemented Admin Edit mode.");
