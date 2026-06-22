"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveEmailTemplate } from "../actions";
import { Save, Plus, Edit, Eye, Code } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TemplatesClient({ initialTemplates }: { initialTemplates: any[] }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [editing, setEditing] = useState<any>(null);
    const [bodyValue, setBodyValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name") as string,
            subject: formData.get("subject") as string,
            body: formData.get("body") as string,
            description: formData.get("description") as string,
        };

        try {
            await saveEmailTemplate(editing?.id || null, data);
            toast.success("Template saved successfully.");
            setEditing(null);
            // Refresh would happen via Server Action revalidatePath, but we just reload cleanly:
            window.location.reload();
        } catch (error) {
            toast.error("Failed to save template.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium">Available Templates</h2>
                    <Button variant="outline" size="sm" onClick={() => {
                        setEditing({ name: "", subject: "", body: "", description: "" });
                        setBodyValue("");
                    }}>
                        <Plus className="w-4 h-4 mr-2" /> New
                    </Button>
                </div>
                <div className="flex flex-col gap-2">
                    {templates.map(t => (
                        <Card key={t.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                            setEditing(t);
                            setBodyValue(t.body || "");
                        }}>
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm">{t.name}</CardTitle>
                                <CardDescription className="text-xs">{t.description || "No description"}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                    {templates.length === 0 && (
                        <p className="text-sm text-muted-foreground">No templates defined.</p>
                    )}
                </div>
            </div>

            <div className="md:col-span-2">
                {editing ? (
                    <Card>
                        <form onSubmit={handleSave}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Edit className="w-5 h-5" /> 
                                    {editing.id ? "Edit Template" : "New Template"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Template Name (System Key)</Label>
                                    <Input name="name" defaultValue={editing.name} placeholder="e.g. vendor_registered" required disabled={!!editing.id} />
                                    <p className="text-xs text-muted-foreground">Used internally to trigger this template. Do not change once set.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input name="description" defaultValue={editing.description} placeholder="When is this sent?" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Subject</Label>
                                    <Input name="subject" defaultValue={editing.subject} placeholder="You can use {{placeholders}}" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Body (HTML or Plain Text)</Label>
                                    <Tabs defaultValue="source" className="w-full">
                                        <TabsList className="mb-2 grid w-[300px] grid-cols-2">
                                            <TabsTrigger value="source"><Code className="w-4 h-4 mr-2"/> Source Code</TabsTrigger>
                                            <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-2"/> Live Preview</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="source">
                                            <Textarea name="body" value={bodyValue} onChange={e => setBodyValue(e.target.value)} className="min-h-[350px] font-mono text-sm" required />
                                            <p className="text-xs text-muted-foreground mt-2">You can use standard HTML tags (e.g. &lt;b&gt;, &lt;p&gt;, &lt;a&gt;) and placeholders like {'{{vendorName}}'}.</p>
                                        </TabsContent>
                                        <TabsContent value="preview">
                                            <div className="border rounded-md min-h-[350px] bg-white overflow-x-auto shadow-inner relative flex justify-center">
                                                <div 
                                                    className="w-full max-w-[600px] my-6"
                                                    dangerouslySetInnerHTML={{ 
                                                    __html: bodyValue
                                                        .replace(/{{vendorName}}/g, 'PT Contoh Vendor Terpercaya')
                                                        .replace(/{{invoiceNumber}}/g, 'INV-2026-0001')
                                                        .replace(/{{status}}/g, 'Verified')
                                                        .replace(/{{comments}}/g, '<p style="background:#fef2f2; border-left:4px solid #ef4444; padding:12px; margin-top:16px;"><strong>Catatan Auditor:</strong><br/>Dokumen tidak lengkap. Mohon lampirkan faktur pajak.</p>')
                                                }} />
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </CardContent>
                            <div className="p-6 pt-0 flex gap-2 justify-end">
                                <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save</>}
                                </Button>
                            </div>
                        </form>
                    </Card>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        Select a template to edit or create a new one.
                    </div>
                )}
            </div>
        </div>
    );
}
