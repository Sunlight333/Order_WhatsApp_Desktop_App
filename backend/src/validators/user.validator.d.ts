import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["SUPER_ADMIN", "USER"]>>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    role: "SUPER_ADMIN" | "USER";
    avatar?: string | null | undefined;
}, {
    username: string;
    password: string;
    role?: "SUPER_ADMIN" | "USER" | undefined;
    avatar?: string | null | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["SUPER_ADMIN", "USER"]>>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    whatsappMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    password?: string | undefined;
    role?: "SUPER_ADMIN" | "USER" | undefined;
    avatar?: string | null | undefined;
    whatsappMessage?: string | null | undefined;
}, {
    username?: string | undefined;
    password?: string | undefined;
    role?: "SUPER_ADMIN" | "USER" | undefined;
    avatar?: string | null | undefined;
    whatsappMessage?: string | null | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    password: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    whatsappMessage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    password?: string | undefined;
    avatar?: string | null | undefined;
    whatsappMessage?: string | null | undefined;
}, {
    password?: string | undefined;
    avatar?: string | null | undefined;
    whatsappMessage?: string | null | undefined;
}>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
