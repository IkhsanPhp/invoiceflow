import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/s3";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const docType = formData.get("docType") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Limit size to 10MB
        const sizeLimit = 10 * 1024 * 1024;
        if (file.size > sizeLimit) {
            return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
        }

        // Allowed file types
        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png"
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Unsupported file format. Only PDF, JPG, JPEG, and PNG are allowed." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload using S3 client utility
        const fileUrl = await uploadFile(buffer, file.name, file.type);

        return NextResponse.json({
            success: true,
            fileUrl,
            fileSize: file.size,
            fileName: file.name,
            docType: docType || "invoice"
        });
    } catch (err: unknown) {
        console.error("Upload error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to upload file";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
