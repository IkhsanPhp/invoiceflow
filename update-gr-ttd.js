const fs = require('fs');
const file = 'app/dashboard/invoice-hub/verify/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace state declarations
const oldState1 = 'const [grReceivedDate, setGrReceivedDate] = useState("");';
const oldState2 = 'const [grDoSignatureDate, setGrDoSignatureDate] = useState("");';
content = content.replace(oldState1, 'const [grTtdKeterangan, setGrTtdKeterangan] = useState("Sesuai");');
content = content.replace(oldState2, '');

// 2. Remove from OCR pre-population
const oldPop1 = 'setGrReceivedDate(getField("receivedDate") || getField("tglTerimaTtd") || "");';
const oldPop2 = 'setGrDoSignatureDate(getField("signatureDate") || getField("tglTtdSj") || "");';
content = content.replace(oldPop1, '');
content = content.replace(oldPop2, '');

// 3. Update handleFinalizeGR
const oldFinalize = `                poNumber: grPoNumber,
                poDate: grPoDate,
                doNumber: grDoNumber,
                doDate: grDoDate,
                receivedDate: grReceivedDate,
                doSignatureDate: grDoSignatureDate,
                supplyStatus: grSupplyStatus`;
const newFinalize = `                poNumber: grPoNumber,
                poDate: grPoDate,
                doNumber: grDoNumber,
                doDate: grDoDate,
                ttdKeterangan: grTtdKeterangan,
                supplyStatus: grSupplyStatus`;
content = content.replace(oldFinalize, newFinalize);

// 4. Update the UI Modal
const oldUI = `<div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl Terima TTD</Label>
                            <Input type="date" readOnly className="col-span-3 text-xs bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80" value={grReceivedDate} onChange={(e) => setGrReceivedDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl TTD SJ</Label>
                            <Input type="date" readOnly className="col-span-3 text-xs bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80" value={grDoSignatureDate} onChange={(e) => setGrDoSignatureDate(e.target.value)} />
                        </div>`;
const newUI = `<div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs leading-tight">Ket. TTD & Tanggal</Label>
                            <select 
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background"
                                value={grTtdKeterangan} 
                                onChange={(e) => setGrTtdKeterangan(e.target.value)}>
                                <option>Sesuai</option>
                                <option>Tidak Sesuai</option>
                            </select>
                        </div>`;
content = content.replace(oldUI, newUI);

fs.writeFileSync(file, content);
console.log("Replaced GR modal date fields with TTD dropdown.");
