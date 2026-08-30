import type { CreateMediaJobInput } from "./types";

export function buildKodexMediaPrompt(input: Pick<CreateMediaJobInput, "title" | "brief" | "kind" | "aspectRatio">): string {
  const ratio = input.aspectRatio || (input.kind === "video" ? "16:9" : "1:1");
  return [
    "Create a polished Kodex Compliance Authority Engine marketing asset.",
    `Asset type: ${input.kind}. Aspect ratio: ${ratio}.`,
    `Subject: ${input.title}.`,
    `Brief: ${input.brief}.`,
    "Brand direction: premium EU compliance technology, restrained editorial design, high trust, modern enterprise SaaS, clean composition, strong information hierarchy.",
    "Avoid fake regulator logos, fabricated official seals, invented legal claims, sensational fear language, and visual claims that are not supported by the source content.",
    "Do not publish or imply endorsement. This asset is a draft for founder review.",
  ].join("\n");
}
