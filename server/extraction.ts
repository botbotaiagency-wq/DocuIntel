import OpenAI from "openai";

function getOpenAI(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not set. Set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY in .env to use document extraction."
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

interface ExtractionResult {
  extractedJson: Record<string, any>;
  confidence: number;
  riskLevel: string;
  validationReport: Record<string, any>;
}

const DOC_TYPE_PROMPTS: Record<string, string> = {
  IC: `You are a document extraction specialist for Malaysian Identity Cards (MyKad/IC).
Extract the following fields from the IC document image:
- full_name: The person's full name
- id_number: The IC number (format: XXXXXX-XX-XXXX)
- date_of_birth: Date of birth (YYYY-MM-DD)
- gender: Male or Female (determine from name prefix: A/L, bin = Male; A/P, binti, bt = Female)
- address: The address shown
- nationality: The nationality
- religion: If visible

Return a JSON object with these fields. If a field cannot be determined, use null.`,

  Geran: `You are a document extraction specialist for Malaysian Land Titles (Geran Tanah).
Extract the following fields:
- title_number: The Geran/title number
- lot_number: The lot number
- mukim: The mukim (district)
- daerah: The daerah (area)
- negeri: The state
- owner_name: Name of the registered owner
- owner_ic: IC number of owner if visible
- land_area: The area of the land
- restriction: Any restrictions or conditions

Return a JSON object with these fields. If a field cannot be determined, use null.`,

  Will: `You are a document extraction specialist for Wills and Testamentary documents.
Extract the following fields:
- testator_name: Name of the person making the will
- testator_ic: IC number of the testator
- date_executed: Date the will was signed
- witnesses: Array of witness names
- executor_name: Name of the appointed executor
- beneficiaries: Array of beneficiary names and what they receive
- special_conditions: Any special conditions or clauses

Return a JSON object with these fields. If a field cannot be determined, use null.`,

  Other: `You are a document extraction specialist for legal documents.
Extract all key information from this document including:
- document_type: The type of document
- parties: Names of all parties involved
- date: Date of the document
- key_terms: Important terms or conditions
- signatures: Names of signatories
- reference_number: Any reference numbers

Return a JSON object with these fields. If a field cannot be determined, use null.`,
};

const VALIDATION_RULES: Record<string, (data: Record<string, any>) => Record<string, any>> = {
  IC: (data) => {
    const report: Record<string, any> = { rules_checked: [], issues: [], passed: true };

    if (data.full_name) {
      report.rules_checked.push("name_format_check");
      const name = data.full_name.toUpperCase();
      if (name.includes("A/L") || name.includes("BIN") || name.includes(" B ") || name.includes(" B.")) {
        if (data.gender && data.gender.toUpperCase() !== "MALE") {
          report.issues.push({
            field: "gender",
            rule: "gender_name_prefix_mismatch",
            message: "Name contains male prefix (A/L or BIN) but gender is not Male",
            severity: "HIGH",
          });
          report.passed = false;
        }
        if (!data.gender) {
          data.gender = "Male";
          report.rules_checked.push("gender_auto_detected_male");
        }
      } else if (name.includes("A/P") || name.includes("BINTI") || name.includes(" BT ") || name.includes(" BT.")) {
        if (data.gender && data.gender.toUpperCase() !== "FEMALE") {
          report.issues.push({
            field: "gender",
            rule: "gender_name_prefix_mismatch",
            message: "Name contains female prefix (A/P or BINTI) but gender is not Female",
            severity: "HIGH",
          });
          report.passed = false;
        }
        if (!data.gender) {
          data.gender = "Female";
          report.rules_checked.push("gender_auto_detected_female");
        }
      }
    }

    if (data.id_number) {
      report.rules_checked.push("ic_format_check");
      const icPattern = /^\d{6}-\d{2}-\d{4}$/;
      if (!icPattern.test(data.id_number)) {
        report.issues.push({
          field: "id_number",
          rule: "ic_format_invalid",
          message: "IC number does not match expected format XXXXXX-XX-XXXX",
          severity: "MED",
        });
      }
    }

    if (data.date_of_birth && data.id_number) {
      report.rules_checked.push("dob_ic_consistency");
      const icDob = data.id_number.substring(0, 6);
      const dobFormatted = data.date_of_birth.replace(/-/g, "").substring(2);
      if (icDob !== dobFormatted && icDob.length === 6) {
        report.issues.push({
          field: "date_of_birth",
          rule: "dob_ic_mismatch",
          message: "Date of birth does not match IC number prefix",
          severity: "MED",
        });
      }
    }

    if (report.issues.length > 0) {
      report.passed = false;
    }

    return report;
  },
};

export async function extractDocument(
  imageDataUri: string,
  docType: string,
  mimeType: string,
  annotations?: Array<{ x: number; y: number; width: number; height: number; label: string }>,
  templateImageUri?: string,
): Promise<ExtractionResult> {
  let systemPrompt = DOC_TYPE_PROMPTS[docType] || DOC_TYPE_PROMPTS.Other;

  if (annotations && annotations.length > 0) {
    const annotationGuide = annotations.map(a =>
      `- "${a.label}": located at approximately x=${Math.round(a.x)}%, y=${Math.round(a.y)}% from top-left, width=${Math.round(a.width)}%, height=${Math.round(a.height)}% of the document`
    ).join("\n");
    systemPrompt += `\n\nIMPORTANT FIELD LOCATION GUIDE - Use these annotated regions to find each field:\n${annotationGuide}\n\nExtract the value for each labeled field from its indicated region on the document.`;
  }

  try {
    const userContent: any[] = [];

    if (templateImageUri && annotations && annotations.length > 0) {
      userContent.push({
        type: "image_url",
        image_url: { url: templateImageUri, detail: "low" },
      });
      userContent.push({
        type: "text",
        text: "Above is an annotated template showing where each field is located on this type of document.",
      });
    }

    userContent.push({
      type: "image_url",
      image_url: { url: imageDataUri, detail: "high" },
    });
    userContent.push({
      type: "text",
      text: "Extract all relevant data from this document image. Return only JSON.",
    });

    const openai = getOpenAI();
    const model = process.env.EXTRACTION_MODEL || "gpt-4o";
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    let extractedJson: Record<string, any>;

    try {
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      extractedJson = JSON.parse(cleaned);
    } catch {
      extractedJson = { raw_response: rawContent, parse_error: true };
    }

    const validateFn = VALIDATION_RULES[docType];
    const validationReport = validateFn ? validateFn(extractedJson) : { rules_checked: [], issues: [], passed: true };

    const hasHighIssues = validationReport.issues?.some((i: any) => i.severity === "HIGH");
    const hasMedIssues = validationReport.issues?.some((i: any) => i.severity === "MED");
    const riskLevel = hasHighIssues ? "HIGH" : hasMedIssues ? "MED" : "LOW";

    const confidence = extractedJson.parse_error ? 0.3 : hasHighIssues ? 0.6 : hasMedIssues ? 0.75 : 0.92;

    return {
      extractedJson,
      confidence,
      riskLevel,
      validationReport,
    };
  } catch (error: any) {
    console.error("AI extraction failed:", error);
    return {
      extractedJson: { error: "Extraction failed", details: error.message },
      confidence: 0,
      riskLevel: "HIGH",
      validationReport: {
        rules_checked: [],
        issues: [{ field: "system", rule: "extraction_failed", message: error.message, severity: "HIGH" }],
        passed: false,
      },
    };
  }
}
