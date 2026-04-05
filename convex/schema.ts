// Schema placeholder — replace with your project schema
// Follow convex_rules.txt for all schema definitions

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Add your tables here following convex_rules.txt conventions:
  //
  // example: defineTable({
  //   name: v.string(),
  //   status: v.union(v.literal("active"), v.literal("archived")),
  //   createdAt: v.number(),
  // })
  //   .index("by_status", ["status"])
  //   .index("by_name", ["name"]),
});
