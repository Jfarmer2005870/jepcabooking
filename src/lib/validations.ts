import { z } from "zod";

// Auth validations
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password must be less than 100 characters");

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Full name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes");

export const businessNameSchema = z
  .string()
  .trim()
  .min(1, "Business name is required")
  .max(150, "Business name must be less than 150 characters");

// Profile validations
export const phoneSchema = z
  .string()
  .trim()
  .max(20, "Phone number must be less than 20 characters")
  .regex(/^[\d\s\-\+\(\)]*$/, "Please enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const bioSchema = z
  .string()
  .trim()
  .max(500, "Bio must be less than 500 characters")
  .optional()
  .or(z.literal(""));

export const urlSchema = z
  .string()
  .trim()
  .url("Please enter a valid URL")
  .max(500, "URL must be less than 500 characters")
  .optional()
  .or(z.literal(""));

export const addressSchema = z
  .string()
  .trim()
  .max(200, "Address must be less than 200 characters")
  .optional()
  .or(z.literal(""));

export const citySchema = z
  .string()
  .trim()
  .max(100, "City must be less than 100 characters")
  .optional()
  .or(z.literal(""));

export const stateSchema = z
  .string()
  .trim()
  .max(50, "State must be less than 50 characters")
  .optional()
  .or(z.literal(""));

export const zipCodeSchema = z
  .string()
  .trim()
  .max(20, "ZIP code must be less than 20 characters")
  .regex(/^[\d\-\s]*$/, "Please enter a valid ZIP code")
  .optional()
  .or(z.literal(""));

// Service validations
export const serviceTitleSchema = z
  .string()
  .trim()
  .min(1, "Service title is required")
  .max(100, "Title must be less than 100 characters");

export const serviceDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description must be less than 1000 characters")
  .optional()
  .or(z.literal(""));

export const priceSchema = z
  .number()
  .min(0, "Price must be positive")
  .max(999999.99, "Price too high")
  .optional();

export const durationSchema = z
  .number()
  .int("Duration must be a whole number")
  .min(1, "Duration must be at least 1 minute")
  .max(1440, "Duration cannot exceed 24 hours")
  .optional();

// Booking validations
export const bookingNotesSchema = z
  .string()
  .trim()
  .max(500, "Notes must be less than 500 characters")
  .optional()
  .or(z.literal(""));

// Composite schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  userType: z.enum(["consumer", "business"]),
  businessName: businessNameSchema.optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const profileSchema = z.object({
  full_name: fullNameSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  bio: bioSchema,
});

export const businessProfileSchema = z.object({
  business_name: businessNameSchema,
  description: serviceDescriptionSchema,
  website: urlSchema,
  address: addressSchema,
  city: citySchema,
  state: stateSchema,
  zip_code: zipCodeSchema,
  service_area: z.string().trim().max(200, "Service area must be less than 200 characters").optional().or(z.literal("")),
});

export const serviceSchema = z.object({
  title: serviceTitleSchema,
  description: serviceDescriptionSchema,
  category: z.enum(["cleaning", "plumbing", "electrical", "landscaping", "painting", "moving", "handyman", "hvac", "pest_control", "other"]),
  price_type: z.enum(["fixed", "hourly", "quote"]),
  price_min: priceSchema,
  price_max: priceSchema,
  duration_minutes: durationSchema,
});

// Helper function to safely validate and get errors
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): { success: boolean; error?: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true };
  }
  return { success: false, error: result.error.errors[0]?.message };
}

export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}