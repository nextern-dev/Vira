import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const budgetPeriodEnum = pgEnum("budget_period", ["monthly", "custom"]);

export const appearanceModeEnum = pgEnum("appearance_mode", [
  "light",
  "dark",
  "system",
]);

export const colorThemeEnum = pgEnum("color_theme", [
  "indigo",
  "ocean",
  "forest",
  "graphite",
  "berry",
]);

/* ------------------------------------------------------------------ */
/* Users & sessions                                                    */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    // Null for OAuth-only accounts (e.g. Google) that never set a password.
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    provider: text("provider").notNull().default("credentials"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    appearanceMode: appearanceModeEnum("appearance_mode")
      .notNull()
      .default("system"),
    colorTheme: colorThemeEnum("color_theme").notNull().default("indigo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique_idx").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique_idx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Verification tokens (email verification + password reset)           */
/* ------------------------------------------------------------------ */

export const verificationKindEnum = pgEnum("verification_kind", [
  "verify_email",
  "reset_password",
]);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    kind: verificationKindEnum("kind").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("verification_tokens_token_hash_unique_idx").on(table.tokenHash),
    index("verification_tokens_user_kind_idx").on(table.userId, table.kind),
  ],
);

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: transactionTypeEnum("kind").notNull(),
    color: text("color").notNull().default("#4338ca"),
    icon: text("icon").notNull().default("tag"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // A user cannot own two categories with the same name for the same kind.
    uniqueIndex("categories_user_kind_name_unique_idx").on(
      table.userId,
      table.kind,
      sql`lower(${table.name})`,
    ),
    index("categories_user_idx").on(table.userId, table.kind),
  ],
);

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Deleting a category must never orphan/destroy a transaction.
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    // Money is stored as an exact integer number of minor units (cents).
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    note: text("note"),
    // Client supplied idempotency key -> blocks duplicate submissions.
    clientRequestId: text("client_request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_user_date_idx").on(
      table.userId,
      table.occurredOn.desc(),
      table.id.desc(),
    ),
    index("transactions_user_type_date_idx").on(
      table.userId,
      table.type,
      table.occurredOn.desc(),
    ),
    index("transactions_user_category_date_idx").on(
      table.userId,
      table.categoryId,
      table.occurredOn.desc(),
    ),
    // NULLs are distinct in Postgres, so this only constrains real keys.
    uniqueIndex("transactions_user_request_unique_idx").on(
      table.userId,
      table.clientRequestId,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // null category => budget covers every expense.
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    limitCents: bigint("limit_cents", { mode: "number" }).notNull(),
    period: budgetPeriodEnum("period").notNull().default("monthly"),
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("budgets_user_idx").on(table.userId, table.isActive),
    index("budgets_user_category_idx").on(table.userId, table.categoryId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type BudgetRow = typeof budgets.$inferSelect;
