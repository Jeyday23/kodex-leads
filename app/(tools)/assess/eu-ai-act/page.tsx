import type { Metadata } from "next";
import { EuAiActQuiz } from "./quiz";

export const metadata: Metadata = {
  title: "EU AI Act Readiness Assessment — Free Tool by Kodex",
  description:
    "7-question assessment to determine your EU AI Act risk classification. Get an instant risk preview and a 66-day action plan.",
};

export default function EuAiActPage() {
  return <EuAiActQuiz />;
}
