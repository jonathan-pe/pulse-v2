import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  numeric,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  picks: many(pick),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Market data (Polymarket ingestion) — hand-authored, not generated.
// See: implementation spec, "Polymarket Sports Ingestion".

export const league = pgTable("league", {
  id: text("id").primaryKey(), // "nba" | "wnba" | "mlb" | "nfl" | "nhl" — fixed seed, not ingested
  name: text("name").notNull(),
  polymarketTagSlug: text("polymarket_tag_slug").notNull().unique(),
});

export const team = pgTable(
  "team",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("team_league_name_idx").on(table.leagueId, table.name)],
);

export const event = pgTable(
  "event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    externalId: text("external_id").notNull().unique(), // Polymarket event.id
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id),
    teamAId: text("team_a_id")
      .notNull()
      .references(() => team.id),
    teamBId: text("team_b_id")
      .notNull()
      .references(() => team.id),
    title: text("title").notNull(),
    // withTimezone: true — a bare `timestamp` column stores wall-clock
    // digits with no zone, so a client reading it interprets those digits
    // in ITS OWN local timezone. That happened to be harmless in production
    // (Vercel's runtime is UTC) but silently shifted these by several hours
    // any time they were read from a non-UTC machine (e.g. local dev, or a
    // one-off diagnostic script) — these columns represent real instants,
    // so they need to round-trip correctly regardless of reader timezone.
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["scheduled", "closed", "resolved"] })
      .notNull()
      .default("scheduled"),
    // Polymarket's event-level volume — rolls up all markets under the
    // event, unlike market.volume which is per-market. Used to rank
    // "popular" events on the home page; never used in scoring.
    volume: numeric("volume").notNull().default("0"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("event_league_status_idx").on(table.leagueId, table.status)],
);

export const market = pgTable(
  "market",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    externalId: text("external_id").notNull().unique(), // Polymarket market.id
    conditionId: text("condition_id").notNull().unique(), // on-chain id, for future CLOB lookups
    eventId: text("event_id")
      .notNull()
      .references(() => event.id),
    marketType: text("market_type", { enum: ["moneyline", "spreads", "totals"] }).notNull(),
    line: numeric("line"), // null for moneyline
    outcomeAName: text("outcome_a_name").notNull(),
    outcomeAPrice: numeric("outcome_a_price").notNull(), // 0-1 probability
    outcomeBName: text("outcome_b_name").notNull(),
    outcomeBPrice: numeric("outcome_b_price").notNull(),
    status: text("status", { enum: ["scheduled", "closed", "resolved"] })
      .notNull()
      .default("scheduled"),
    resolvedOutcomeIndex: integer("resolved_outcome_index"), // 0 | 1, null until resolved
    volume: numeric("volume").notNull().default("0"), // Polymarket volumeNum — ranks default line client-side, never used in scoring
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("market_event_idx").on(table.eventId),
    index("market_status_idx").on(table.status),
  ],
);

export const pick = pgTable(
  "pick",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    marketId: text("market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" }),
    outcomeIndex: integer("outcome_index").notNull(), // 0 | 1 — matches market.outcomeA/BName
    priceAtPick: numeric("price_at_pick").notNull(), // snapshot at submit/edit time — market's own price gets overwritten on every ingestion sync
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("pick_user_market_idx").on(table.userId, table.marketId),
    index("pick_market_idx").on(table.marketId),
  ],
);

export const teamRelations = relations(team, ({ one, many }) => ({
  league: one(league, {
    fields: [team.leagueId],
    references: [league.id],
  }),
  homeEvents: many(event, { relationName: "teamA" }),
  awayEvents: many(event, { relationName: "teamB" }),
}));

export const eventRelations = relations(event, ({ one, many }) => ({
  league: one(league, {
    fields: [event.leagueId],
    references: [league.id],
  }),
  teamA: one(team, {
    fields: [event.teamAId],
    references: [team.id],
    relationName: "teamA",
  }),
  teamB: one(team, {
    fields: [event.teamBId],
    references: [team.id],
    relationName: "teamB",
  }),
  markets: many(market),
}));

export const marketRelations = relations(market, ({ one, many }) => ({
  event: one(event, {
    fields: [market.eventId],
    references: [event.id],
  }),
  picks: many(pick),
}));

export const pickRelations = relations(pick, ({ one }) => ({
  user: one(user, { fields: [pick.userId], references: [user.id] }),
  market: one(market, { fields: [pick.marketId], references: [market.id] }),
}));
