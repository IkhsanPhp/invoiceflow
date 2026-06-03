"use server";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function getUsers() {
    try {
        const list = await db.select().from(user).orderBy(user.createdAt);
        return { success: true, users: list };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch users";
        console.error("Failed to fetch users:", error);
        return { success: false, error: errorMessage };
    }
}

export async function createUser(formData: {
    name: string;
    email: string;
    role: "vendor" | "procurement" | "finance" | "admin";
    password?: string;
}) {
    try {
        // Sign up user via Better Auth server-side API to correctly handle password hashing and links
        const result = await auth.api.signUpEmail({
            body: {
                email: formData.email,
                password: formData.password && formData.password.trim() !== "" ? formData.password : "Password123!",
                name: formData.name,
                role: formData.role,
            }
        });
        
        revalidatePath("/dashboard/users");
        return { success: true, user: result.user };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create user";
        console.error("Failed to create user:", error);
        return { success: false, error: errorMessage };
    }
}

export async function updateUser(
    id: string,
    formData: {
        name: string;
        email: string;
        role: "vendor" | "procurement" | "finance" | "admin";
    }
) {
    try {
        await db.update(user)
            .set({
                name: formData.name,
                email: formData.email,
                role: formData.role,
                updatedAt: new Date()
            })
            .where(eq(user.id, id));
            
        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update user";
        console.error("Failed to update user:", error);
        return { success: false, error: errorMessage };
    }
}

export async function deleteUser(id: string) {
    try {
        await db.delete(user).where(eq(user.id, id));
        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
        console.error("Failed to delete user:", error);
        return { success: false, error: errorMessage };
    }
}

import { userPermissions } from "@/db/schema/schema";
import { AVAILABLE_MENUS } from "@/lib/permissions";

export async function getUserPermissions(userId: string) {
    try {
        const list = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
        return { success: true, permissions: list };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch user permissions";
        console.error("Failed to fetch user permissions:", error);
        return { success: false, error: errorMessage };
    }
}

export async function saveUserPermissions(
    userId: string,
    permissionsList: {
        menuKey: string;
        canAccess: boolean;
        canCreate: boolean;
        canUpdate: boolean;
        canDelete: boolean;
    }[]
) {
    try {
        // Delete existing permissions for this user
        await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

        // Insert new permissions
        if (permissionsList.length > 0) {
            await db.insert(userPermissions).values(
                permissionsList.map((p) => ({
                    id: crypto.randomUUID(),
                    userId,
                    menuKey: p.menuKey,
                    canAccess: p.canAccess,
                    canCreate: p.canCreate,
                    canUpdate: p.canUpdate,
                    canDelete: p.canDelete,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            );
        }

        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to save user permissions";
        console.error("Failed to save user permissions:", error);
        return { success: false, error: errorMessage };
    }
}

export async function getAllPermissionsForUser(userId: string) {
    try {
        const userRec = await db.select().from(user).where(eq(user.id, userId)).limit(1);
        if (userRec.length === 0) {
            return AVAILABLE_MENUS.reduce((acc, menu) => {
                acc[menu.key] = { canAccess: false, canCreate: false, canUpdate: false, canDelete: false };
                return acc;
            }, {} as Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>);
        }
        const role = userRec[0].role;

        // Fetch custom overrides
        const customList = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
        const customMap = new Map(customList.map(c => [c.menuKey, c]));

        const permissionsMap: Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }> = {};

        for (const menu of AVAILABLE_MENUS) {
            // Force superadmin to have all accesses default
            if (role === "admin") {
                permissionsMap[menu.key] = { canAccess: true, canCreate: true, canUpdate: true, canDelete: true };
                continue;
            }

            const custom = customMap.get(menu.key);
            if (custom) {
                permissionsMap[menu.key] = {
                    canAccess: custom.canAccess,
                    canCreate: custom.canCreate,
                    canUpdate: custom.canUpdate,
                    canDelete: custom.canDelete
                };
            } else {
                // Fallback for non-admins
                permissionsMap[menu.key] = { canAccess: false, canCreate: false, canUpdate: false, canDelete: false };
            }
        }

        return permissionsMap;
    } catch (error) {
        console.error("Failed to load permissions:", error);
        return {};
    }
}

export async function getMyPermissions() {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    if (!session || !session.user) {
        return { success: false, permissions: {} };
    }
    const permissions = await getAllPermissionsForUser(session.user.id);
    return { success: true, permissions };
}


