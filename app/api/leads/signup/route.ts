import { NextRequest, NextResponse } from "next/server"

interface SignupRequest {
  email: string
  company: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json()

    // Validate input
    if (!body.email || !body.company) {
      return NextResponse.json(
        { success: false, message: "Email and company are required" },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      )
    }

    // TODO: Save to database/CRM
    // For now, just log and return success
    console.log("New lead signup:", body)

    return NextResponse.json(
      { success: true, message: "Signup successful" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
