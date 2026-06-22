const fs = require('fs');
const file = 'app/dashboard/invoice-hub/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove numbers from filter tabs
content = content.replace('Semua ({totalCount})', 'Semua');
content = content.replace('Awaiting Review ({inReviewCount})', 'Awaiting Review');
content = content.replace('Verified ({verifiedCount})', 'Verified');
content = content.replace('Needs Revision ({revisionCount})', 'Needs Revision');
content = content.replace('Rejected ({invoices.filter(i => i.status === "Rejected").length})', 'Rejected');
content = content.replace('Paid ({invoices.filter(i => i.status === "Paid").length})', 'Paid');

// 2. Add Rejected scorecard and change grid cols to 5
const gridTarget = 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"';
const gridReplacement = 'className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4"';
content = content.replace(gridTarget, gridReplacement);

const newCard = `                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected</span>
                        <div className="h-8 w-8 bg-red-50 dark:bg-red-950/40 rounded-lg flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{invoices.filter(i => i.status === "Rejected").length}</div>
                        <p className="text-[10px] font-semibold text-red-600 mt-2">
                            DITOLAK / REJECTED
                        </p>
                    </CardContent>
                </Card>
            </div>`;

const endOfCards = `                    </CardContent>
                </Card>
            </div>`;

content = content.replace(endOfCards, newCard);

// 3. Make sure XCircle is imported from lucide-react
if (!content.includes('XCircle')) {
    content = content.replace('CheckCircle2,', 'CheckCircle2, XCircle,');
    if (!content.includes('XCircle')) {
        content = content.replace('import { ', 'import { XCircle, ');
    }
}

fs.writeFileSync(file, content);
console.log('Update successful: removed tab numbers and added rejected card.');
