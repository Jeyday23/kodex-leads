import type { Metadata } from "next";
import { GdprCalculator } from "./calculator";

export const metadata: Metadata = {
  title: "GDPR Fine Risk Calculator — Free Tool by Kodex",
  description:
    "Estimate your potential GDPR fine exposure under Article 83. See comparable enforcement cases and get a risk breakdown.",
};

export default function GdprPage() {
  return <GdprCalculator />;
}
