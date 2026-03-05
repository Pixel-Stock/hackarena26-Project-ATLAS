import { z } from 'zod';

/* ============================================================
   ATLAS — Auth Validation Schemas (Zod)
   ============================================================ */

// Password must meet all requirements
const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password must be at most 32 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
        /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
        'Password must contain at least one special character'
    );

export const signUpSchema = z
    .object({
        email: z
            .string()
            .min(1, 'Email is required')
            .email('Please enter a valid email address'),
        password: passwordSchema,
        confirm_password: z.string().min(1, 'Please confirm your password'),
        full_name: z
            .string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name must be at most 100 characters')
            .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: 'Passwords do not match',
        path: ['confirm_password'],
    });

export const signInSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
    remember_me: z.boolean(),
});

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
});

export const updateProfileSchema = z.object({
    full_name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters')
        .optional(),
    theme_preference: z.enum(['dark', 'light', 'system']).optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
