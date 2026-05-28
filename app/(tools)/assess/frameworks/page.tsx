import type { Metadata } from "next";
import { StackAudit } from "./audit";

export const metadata: Metadata = {
  title: "Compliance Stack Audit — Free Tool by Kodex",
  description:
    "Select your required compliance frameworks. See overlapping controls, unique obligations, and how much effort you can save.",
};

export default function FrameworksPage() {
  return <StackAudit />;
}
