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

// @ts-expect-error - pdf-parse has no default export but is callable
import pdfParse from 'pdf-parse';

/**
 * Extracts text content from a PDF file buffer using pure Node.js pdf-parse library.
 */
export async function extractPdfToMarkdown(pdfBuffer: Buffer): Promise<string> {
    try {
        console.log(`extractPdfToMarkdown: Starting extraction using pdf-parse. Buffer size: ${pdfBuffer.length} bytes`);
        const data = await pdfParse(pdfBuffer);
        console.log(`extractPdfToMarkdown: Successfully extracted ${data.numpages} pages.`);
        return data.text;
    } catch (err) {
        console.error("Failed to extract text from PDF using pdf-parse:", err);
        throw err;
    }
}

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

/**
 * Processes extracted Markdown text using Ollama's qwen3-vl model to extract structured invoice fields.
 */
export async function extractFieldsWithOllama(markdownContent: string): Promise<MultiDocumentExtraction> {
    const endpoint = process.env.OLLAMA_API_ENDPOINT || 'http://localhost:11434/api';
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL || 'qwen3-vl:235b-cloud';

    const url = `${endpoint.replace(/\/$/, '')}/chat`;
    
    console.log(`Sending Markdown to Ollama at URL: ${url} using model: ${model}`);

    const userPrompt = `Extract and classify the pages from this document:\n\n[DOCUMENT START]\n${markdownContent}\n[DOCUMENT END]`;
    let assistantContent = "";
    
    const provider = process.env.OCR_PROVIDER || 'gemini';

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

/**
 * Sends multiple document buffers directly to Gemini Vision API.
 * This completely bypasses pdf-parse, avoiding failures on scanned documents,
 * and allows Gemini's multimodal vision to natively "read" the documents.
 */
export async function extractFieldsWithGeminiVision(
    documents: { docType: string; mimeType: string; base64: string }[]
): Promise<MultiDocumentExtraction> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is missing in environment variables.");
    
    // We use gemini-1.5-pro or gemini-2.5-flash as they support multimodal PDFs
    const model = 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const parts: any[] = [
        { text: `System Instruction: ${systemPrompt}` },
        { text: `\nTask: Extract and classify the pages from these documents. They are provided below in sequence. Return ONLY a valid JSON object matching the requested schema.\n` }
    ];

    documents.forEach((doc, idx) => {
        parts.push({ text: `\n--- START DOCUMENT ${idx + 1} (${doc.docType}) ---\n` });
        parts.push({
            inlineData: {
                mimeType: doc.mimeType,
                data: doc.base64
            }
        });
        parts.push({ text: `\n--- END DOCUMENT ${idx + 1} (${doc.docType}) ---\n` });
    });

    console.log(`Sending ${documents.length} document(s) directly to Gemini Vision (${model}) API...`);
    
    const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts }]
        }),
        signal: AbortSignal.timeout(300000)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Vision API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const responseData = await response.json();
    const assistantContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!assistantContent) {
        throw new Error(`Received empty response from Gemini Vision`);
    }

    console.log(`Gemini Vision raw output:`, assistantContent);

    try {
        let cleanJson = assistantContent.trim();
        
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
            console.warn('Gemini Vision response did not contain documents array, converting flat fields.');
            data = {
                documents: [
                    {
                        id: "doc-1",
                        type: documents[0]?.docType || "invoice",
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
        console.error('Failed to parse Gemini Vision output as JSON:', parseErr);
        throw new Error(`Failed to parse Gemini Vision extraction: ${message}`);
    }
}
