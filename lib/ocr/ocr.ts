import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';


export interface ExtractedDocumentItem {
    description: string | null;
    quantity: number | null;
    unit: string | null;
    unitPrice: string | null;
    totalPrice: string | null;
}

export interface ExtractedDocument {
    id: string;
    type: "invoice" | "tax_invoice" | "delivery_order" | "po";
    pages: number[];
    data: {
        invoiceNumber?: string | null;
        taxInvoiceNumber?: string | null;
        issueDate?: string | null;
        dueDate?: string | null;
        totalAmount?: string | null;
        vendorName?: string | null;
        customerName?: string | null;
        doNumber?: string | null;
        deliveryDate?: string | null;
        poNumber?: string | null;
        recipientName?: string | null;
        poDate?: string | null;
        buyerName?: string | null;
        // Financial summary fields
        discount?: string | null;
        ppnPercent?: string | null;
        grandTotal?: string | null;
        bankName?: string | null;
        bankAccount?: string | null;
    };
    fields?: { key: string; label: string; value: string | null }[];
    items?: ExtractedDocumentItem[];
}

export interface MultiDocumentExtraction {
    documents: ExtractedDocument[];
}

/**
 * Extracts text content from a PDF file buffer using OpenDataLoader PDF CLI.
 */
export function extractPdfToMarkdown(pdfBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const scratchDir = path.join(process.cwd(), 'scratch');
        if (!fs.existsSync(scratchDir)) {
            fs.mkdirSync(scratchDir, { recursive: true });
        }

        // Create temporary PDF file
        const tempId = crypto.randomUUID();
        const tempPdfPath = path.join(scratchDir, `temp-${tempId}.pdf`);
        fs.writeFileSync(tempPdfPath, pdfBuffer);

        const pythonScriptPath = path.join(process.cwd(), 'lib', 'ocr', 'fast-ocr.py');
        console.log(`Running Fast OCR using Python: python ${pythonScriptPath} ${tempPdfPath}`);

        const pythonProcess = spawn('python', [pythonScriptPath, tempPdfPath]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            // Clean up temporary PDF file
            try {
                if (fs.existsSync(tempPdfPath)) {
                    fs.unlinkSync(tempPdfPath);
                }
            } catch (cleanupErr) {
                console.error("Error cleaning up temporary PDF:", cleanupErr);
            }

            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Python Fast OCR exited with code ${code}.\nStderr: ${stderr}`));
            }
        });

        pythonProcess.on('error', (err) => {
            // Clean up temporary PDF file
            try {
                if (fs.existsSync(tempPdfPath)) {
                    fs.unlinkSync(tempPdfPath);
                }
            } catch {
                // ignore
            }
            reject(err);
        });
    });
}

/**
 * Processes extracted Markdown text using Ollama's qwen3-vl model to extract structured invoice fields.
 */
export async function extractFieldsWithOllama(markdownContent: string): Promise<MultiDocumentExtraction> {
    const endpoint = process.env.OLLAMA_API_ENDPOINT || 'http://localhost:11434/api';
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL || 'qwen3-vl:235b-cloud';

    const url = `${endpoint.replace(/\/$/, '')}/chat`;
    
    console.log(`Sending Markdown to Ollama at URL: ${url} using model: ${model}`);

    const systemPrompt = `You are a precise JSON extractor and document classifier.
Analyze the provided multi-page document written in Markdown. Pages are separated by lines like "--- PAGE %page-number% ---" where %page-number% is the page number.

Your tasks:
1. Classify each page into one of the following types:
   - "invoice" (Invoice / Kwitansi / Bill)
   - "tax_invoice" (Faktur Pajak)
   - "delivery_order" (Delivery Order / Surat Jalan / DO)
   - "po" (Purchase Order / PO)
2. Group contiguous/related pages that belong to the same document together (e.g. if page 1 and page 2 are part of the same Invoice, group them into one document covering pages [1, 2]).
3. Extract relevant structured fields for the "data" object depending on its type:
   - For "invoice": "invoiceNumber", "taxInvoiceNumber", "issueDate" (YYYY-MM-DD), "dueDate" (YYYY-MM-DD), "totalAmount" (Numeric string), "vendorName", "discount", "ppnPercent", "grandTotal", "bankName", "bankAccount".
   - For "tax_invoice": "taxInvoiceNumber", "issueDate", "totalAmount", "vendorName", "customerName", "discount", "ppnPercent", "grandTotal".
   - For "delivery_order": "doNumber", "deliveryDate", "poNumber", "vendorName", "recipientName", "hasSignature" ("yes" | "no" | "unclear"), "hasStamp" ("yes" | "no" | "unclear"), "stampDate" (YYYY-MM-DD or null).
   - For "po": "poNumber", "poDate", "totalAmount", "vendorName", "buyerName", "discount", "ppnPercent", "grandTotal".
4. Extract ALL text key-value pairs (including bank account, bank name, payment terms, tax rate, tax identification details, reference SPK/PO numbers, notes) into the "fields" array. Each field must have:
   - "key": CamelCase key name.
   - "label": Friendly Indonesian label (e.g., "Nomor Rekening", "Nama Bank", "Syarat Pembayaran").
   - "value": The extracted value as a string.
5. Extract ALL items from any tabular data on the document into the "items" array. Each item must have:
   - "description": Description of item or job (e.g. "GANTI SEAL BEARING RODA INNER REAR LH 1 EA...").
   - "quantity": Number of items (numeric or null).
   - "unit": Unit of measurement (e.g., "JOB", "PCS", "UNIT", "EA").
   - "unitPrice": Unit price (numeric string, e.g. "650000.00").
   - "totalPrice": Total price (numeric string, e.g. "650000.00").

Return ONLY a valid JSON object matching the schema below. Do NOT wrap the JSON inside markdown code fences (\`\`\`json or \`\`\`), do NOT include any introductory or concluding text, just output the raw JSON object.

Schema:
{
  "documents": [
    {
      "id": "doc-1",
      "type": "invoice | tax_invoice | delivery_order | po",
      "pages": [1, 2],
      "data": {
        "invoiceNumber": "081/PMJ-2026",
        "taxInvoiceNumber": "04002600148819235",
        "issueDate": "2026-04-27",
        "dueDate": null,
        "totalAmount": "721500.00",
        "vendorName": "PT. Pelita Motor Jaya",
        "discount": null,
        "ppnPercent": "12",
        "grandTotal": "721500.00",
        "bankName": "Bank Central Asia",
        "bankAccount": "191 1425 888"
      },
      "fields": [
        { "key": "invoiceNumber", "label": "Nomor Invoice", "value": "081/PMJ-2026" },
        { "key": "spkNumber", "label": "Nomor SPK", "value": "016998" },
        { "key": "bankAccount", "label": "Rekening Bank", "value": "Bank Central Asia AC: 191 1425 888" }
      ],
      "items": [
        {
          "description": "GANTI SEAL BEARING RODA INNER REAR LH 1 EA + GANTI SEAL BEARING RODA OUTER REAR LH 1 EA",
          "quantity": 1,
          "unit": "JOB",
          "unitPrice": "650000.00",
          "totalPrice": "650000.00"
        }
      ]
    }
  ]
}`;

    const userPrompt = `Extract and classify the pages from this document:\n\n[DOCUMENT START]\n${markdownContent}\n[DOCUMENT END]`;
    let assistantContent = "";
    
    const provider = process.env.OCR_PROVIDER || 'ollama';

    if (provider === 'gemini') {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) throw new Error("GEMINI_API_KEY is missing in environment variables.");
        
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        // Gemini expects system prompt in system_instruction, or just bundled into the prompt.
        const combinedPrompt = `System Instruction: ${systemPrompt}\n\nTask: ${userPrompt}`;
        
        console.log(`Sending Markdown to Gemini at URL: ${geminiUrl.split("?key")[0]}...`);
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: combinedPrompt }] }]
            }),
            signal: AbortSignal.timeout(300000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const responseData = await response.json();
        assistantContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        
    } else {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                stream: false
            }),
            signal: AbortSignal.timeout(300000) // 5 minutes timeout to prevent Headers Timeout Error
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const responseData = await response.json();
        assistantContent = responseData.message?.content?.trim() || "";
    }

    if (!assistantContent) {
        throw new Error(`Received empty response from ${provider}`);
    }

    console.log(`${provider} raw output:`, assistantContent);

    try {
        let cleanJson = assistantContent.trim();
        
        // Find first occurrence of '{' and last occurrence of '}' to extract raw JSON
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        }

        let data = JSON.parse(cleanJson);
        if (!data || typeof data !== 'object') {
            throw new Error('Parsed JSON is not an object');
        }

        if (!Array.isArray(data.documents)) {
            console.warn('Ollama response did not contain documents array, converting flat fields.');
            data = {
                documents: [
                    {
                        id: "doc-1",
                        type: "invoice",
                        pages: [1],
                        data: {
                            invoiceNumber: data.invoiceNumber || null,
                            taxInvoiceNumber: data.taxInvoiceNumber || null,
                            issueDate: data.issueDate || null,
                            dueDate: data.dueDate || null,
                            totalAmount: data.totalAmount || null,
                            vendorName: data.vendorName || null
                        }
                    }
                ]
            };
        }

        return data as MultiDocumentExtraction;
    } catch (parseErr: unknown) {
        const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error('Failed to parse Ollama output as JSON:', parseErr);
        console.error('Raw content was:', assistantContent);
        throw new Error(`Failed to parse Ollama extraction: ${message}`);
    }
}
