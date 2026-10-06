import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-z]/i, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const displayNameSchema = z
  .string()
  .trim()
  .max(60, "Keep it under 60 characters")
  .optional()
  .or(z.literal(""));

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(UNI-[A-Z]{3}\d{3})?$/, "Referral codes look like UNI-ROS123")
  .optional()
  .or(z.literal(""));
