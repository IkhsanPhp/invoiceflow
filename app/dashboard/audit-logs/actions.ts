"use server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { eq, desc } from "drizzle-orm";

export async function getAuditLogsMaster() {
    try {
        const list = await db.select({
            id: auditLogs.id,
            action: auditLogs.action,
            targetType: auditLogs.targetType,
            targetId: auditLogs.targetId,
            metadata: auditLogs.metadata,
            loggedAt: auditLogs.loggedAt,
            userName: user.name,
            userEmail: user.email,
        })
        .from(auditLogs)
        .leftJoin(user, eq(auditLogs.userId, user.id))
        .orderBy(desc(auditLogs.loggedAt));

        return { success: true, logs: list };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch audit logs";
        console.error("Failed to fetch audit logs:", error);
        return { success: false, error: errorMessage };
    }
}
