import { db } from './db/index';
import { invoices, auditLogs } from './db/schema/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function fix() {
    const inv = await db.select().from(invoices).where(eq(invoices.invoiceNumber, 'MJB/S-NP/082/IV/2026')).limit(1);
    if (inv.length) {
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: inv[0].vendorId || 'SYSTEM',
            action: 'SHIPPING_SUBMITTED',
            targetType: 'Invoice',
            targetId: inv[0].id,
            metadata: { note: 'Manual fix' }
        });
        console.log('Fixed');
    } else {
        console.log('Not found');
    }
}
fix().catch(console.error);
