import { z } from "zod";
import { isValidIsoDate } from "@/lib/dates";
import { MAX_AMOUNT_CENTS, parseAmountToCents, SUPPORTED_CURRENCIES } from "@/lib/money";
import { badRequest } from "@/lib/http";
import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryIcon,
} from "@/lib/icons";
import { APPEARANCE_MODES, COLOR_THEMES } from "@/lib/appearance";

const isoDate = z
  .string()
  .trim()
  .refine((value) => isValidIsoDate(value), "Use a real calendar date (YYYY-MM-DD).");

const amount = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const cents = parseAmountToCents(value);
    if (cents === null) {
      ctx.addIssue({
        code: "custom",
        message: `Enter an amount between 0.01 and ${(MAX_AMOUNT_CENTS / 100).toLocaleString()}.`,
      });
      return z.NEVER;
    }
    return cents;
  });

const optionalNote = z
  .string()
  .trim()
  .max(280, "Notes are limited to 280 characters.")
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .transform((value) => value ?? null);

const uuid = z.string().uuid("Invalid identifier.");
const nullableUuid = z
  .union([uuid, z.literal(""), z.null()])
  .transform((value) => (value ? value : null))
  .nullish()
  .transform((value) => value ?? null);

export const transactionType = z.enum(["income", "expense"]);

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour.")
  .transform((value) => value.toLowerCase());

/* ----------------------------- auth ------------------------------- */

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80, "Name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email is too long.")
    .pipe(z.email("Enter a valid email address.")),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200, "Password is too long.")
    .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
      message: "Include at least one letter and one number.",
    }),
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

export const appearanceSchema = z.object({
  mode: z.enum(APPEARANCE_MODES),
  theme: z.enum(COLOR_THEMES),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200)
    .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
      message: "Include at least one letter and one number.",
    }),
});

/* -------------------------- categories ---------------------------- */

/** Icons are normalised to a known name — unknown input can never be stored. */
const iconName = z
  .string()
  .trim()
  .max(32)
  .transform((value) => normalizeCategoryIcon(value));

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name your category.").max(48, "Keep names under 48 characters."),
  kind: transactionType,
  color: hexColor.default(DEFAULT_CATEGORY_COLOR),
  icon: iconName.default(DEFAULT_CATEGORY_ICON),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name your category.").max(48).optional(),
  color: hexColor.optional(),
  icon: iconName.optional(),
  isArchived: z.boolean().optional(),
});

/* -------------------------- transactions -------------------------- */

export const transactionCreateSchema = z.object({
  type: transactionType,
  amount,
  occurredOn: isoDate,
  categoryId: nullableUuid,
  note: optionalNote,
  clientRequestId: z.string().trim().min(8).max(64).optional(),
});

export const transactionUpdateSchema = z.object({
  type: transactionType,
  amount,
  occurredOn: isoDate,
  categoryId: nullableUuid,
  note: optionalNote,
});

export const transactionFilterSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  type: z.union([transactionType, z.literal("all")]).default("all"),
  categoryId: z.union([uuid, z.literal("all"), z.literal("uncategorized")]).default("all"),
  minAmount: z.string().trim().optional(),
  maxAmount: z.string().trim().optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(10_000).default(25),
});

/* ---------------------------- budgets ----------------------------- */

export const budgetCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name your budget.").max(60),
    categoryId: nullableUuid,
    limit: amount,
    period: z.enum(["monthly", "custom"]).default("monthly"),
    startsOn: isoDate.optional(),
    endsOn: isoDate.optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.period === "custom") {
      if (!value.startsOn || !value.endsOn) {
        ctx.addIssue({
          code: "custom",
          path: ["startsOn"],
          message: "Custom budgets need a start and end date.",
        });
        return;
      }
      if (value.startsOn > value.endsOn) {
        ctx.addIssue({
          code: "custom",
          path: ["endsOn"],
          message: "The end date must be on or after the start date.",
        });
      }
    }
  });

export const budgetUpdateSchema = budgetCreateSchema;

/* ---------------------------- helpers ----------------------------- */

export function parseOrThrow<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = result.error.issues[0]?.message ?? "Invalid input.";
  throw badRequest(first, fields);
}

export function searchParamsToObject(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== "") out[key] = value;
  }
  return out;
}
