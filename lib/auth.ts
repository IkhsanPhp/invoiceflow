import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import { account, session, user, verification } from "@/db/schema/auth";

import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    trustHost: true,
    trustedOrigins: [
        "https://proc-share.chitraparatama.com",
        process.env.BETTER_AUTH_URL ? process.env.BETTER_AUTH_URL.replace(/\/$/, "") : ""
    ].filter(Boolean),
    advanced: {
        defaultCookieAttributes: {
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        }
    },
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user: user,
            account: account,
            session: session,
            verification: verification,
        }
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 4,
        async sendResetPassword(data, request) {
            await sendEmail({
                to: data.user.email,
                subjectOverride: "Reset Your Password - Invoice Flow",
                bodyOverride: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Reset Your Password</h2>
                        <p>Hi ${data.user.name},</p>
                        <p>You recently requested to reset your password for your Invoice Flow account. Click the button below to reset it.</p>
                        <a href="${data.url}" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">Reset Password</a>
                        <p>If you did not request a password reset, please ignore this email.</p>
                        <p>Thanks,<br>Invoice Flow Team</p>
                    </div>
                `
            });
        }
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "vendor",
                required: false,
                input: true,
            }
        }
    }
});