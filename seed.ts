import { db } from "./server/db";
import { orgs, documentSchemas } from "./shared/schema";

async function seed() {
  const existingOrgs = await db.select().from(orgs);
  if (existingOrgs.length === 0) {
    const [org] = await db.insert(orgs).values({
      name: "Default Organization",
      retentionDays: 7,
      processOnlyMode: false
    }).returning();

    await db.insert(documentSchemas).values([
      {
        orgId: org.id,
        docType: "IC",
        jsonSchema: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            id_number: { type: "string" },
            date_of_birth: { type: "string" },
            gender: { type: "string" },
            address: { type: "string" },
            nationality: { type: "string" },
            expiry_date: { type: "string" },
            issue_date: { type: "string" },
            document_side: { type: "string" }
          },
          required: ["full_name", "id_number"]
        }
      },
      {
        orgId: org.id,
        docType: "Geran",
        jsonSchema: {
          type: "object",
          properties: {
            title_number: { type: "string" },
            lot_number: { type: "string" },
            mukim: { type: "string" },
            district: { type: "string" },
            state: { type: "string" },
            land_area: { type: "string" },
            tenure_type: { type: "string" },
            proprietor_name: { type: "string" },
            proprietor_id: { type: "string" },
            restrictions_in_interest: { type: "string" },
            encumbrances: { type: "string" },
            issue_date: { type: "string" }
          }
        }
      },
      {
        orgId: org.id,
        docType: "Will",
        jsonSchema: {
          type: "object",
          properties: {
            testator_full_name: { type: "string" },
            testator_id: { type: "string" },
            testator_address: { type: "string" },
            will_date: { type: "string" },
            executor_names: { type: "array", items: { type: "string" } },
            beneficiaries: { type: "array", items: { type: "object" } },
            witnesses: { type: "array", items: { type: "object" } },
            special_instructions: { type: "string" },
            signatures_present: { type: "boolean" }
          }
        }
      },
      {
        orgId: org.id,
        docType: "Other Legal Doc",
        jsonSchema: {
          type: "object",
          properties: {
            document_title: { type: "string" },
            parties: { type: "array", items: { type: "object" } },
            key_dates: { type: "array", items: { type: "object" } },
            reference_numbers: { type: "array", items: { type: "string" } },
            addresses: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            extracted_entities: { type: "string" }
          }
        }
      }
    ]);
    console.log("Database seeded successfully");
  } else {
    console.log("Database already seeded");
  }
}

seed().catch((err) => {
  console.error("Failed to seed database:", err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});