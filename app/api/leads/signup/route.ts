import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { captureLead } from "@/lib/seo/lead-intake"
import type { LeadCaptureInput } from "@/lib/seo/types"

const MAX_EMAIL_LENGTH = 320
const MAX_COMPANY_LENGTH = 120
const MAX_LANDING_PAGE_LENGTH = 500
const DEFAULT_LANDING_PAGE = "/"

const MISSING_FIELDS_MESSAGE = "Email and company are required"
const INVALID_EMAIL_MESSAGE = "Invalid email address"
const PERSISTENCE_FAILED_MESSAGE = "Signup could not be saved"
const INTERNAL_ERROR_MESSAGE = "Internal server error"

/**
 * The short landing-page form only collects an email and a company name, so
 * every remaining field of the full lead contract gets an explicit,
 * deliberately low-signal default. These must never inflate the lead score:
 * an unknown prospect stays "low" until real qualification data arrives.
 */
const SIGNUP_LEAD_DEFAULTS = {
  framework: "unknown",
  companySize: "1-10",
  aiUse: "none",
  complianceMaturity: "unknown",
  urgency: "researching",
} as const satisfies Pick<
  LeadCaptureInput,
  "framework" | "companySize" | "aiUse" | "complianceMaturity" | "urgency"
>

/** Preserved from the original endpoint so previously rejected emails stay rejected. */
const LEGACY_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const emailSchema = z.email()

const signupSchema = z.object({
  email: z.string().trim().min(1).max(MAX_EMAIL_LENGTH),
  company: z.string().trim().min(2).max(MAX_COMPANY_LENGTH),
  landingPage: z.string().trim().min(1).max(MAX_LANDING_PAGE_LENGTH).optional(),
})

function isValidEmail(email: string): boolean {
  return LEGACY_EMAIL_PATTERN.test(email) && emailSchema.safeParse(email).success
}

function resolveLandingPage(explicit: string | undefined, referer: string | null): string {
  if (explicit) return explicit.slice(0, MAX_LANDING_PAGE_LENGTH)
  if (!referer) return DEFAULT_LANDING_PAGE

  try {
    const { pathname, search } = new URL(referer)
    const path = `${pathname}${search}`.slice(0, MAX_LANDING_PAGE_LENGTH)
    return path || DEFAULT_LANDING_PAGE
  } catch {
    return DEFAULT_LANDING_PAGE
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: MISSING_FIELDS_MESSAGE }, { status: 400 })
    }

    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: MISSING_FIELDS_MESSAGE }, { status: 400 })
    }

    if (!isValidEmail(parsed.data.email)) {
      return NextResponse.json({ success: false, message: INVALID_EMAIL_MESSAGE }, { status: 400 })
    }

    const lead: LeadCaptureInput = {
      ...SIGNUP_LEAD_DEFAULTS,
      email: parsed.data.email,
      companyName: parsed.data.company,
      landingPage: resolveLandingPage(parsed.data.landingPage, request.headers.get("referer")),
    }

    const result = await captureLead(lead)
    if (!result.ok) {
      // Never log the lead payload itself: it is PII.
      console.error("Lead signup persistence failed:", result.detail)
      return NextResponse.json({ success: false, message: PERSISTENCE_FAILED_MESSAGE }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        message: "Signup successful",
        leadId: result.leadId,
        storage: result.storage,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Signup error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ success: false, message: INTERNAL_ERROR_MESSAGE }, { status: 500 })
  }
}
