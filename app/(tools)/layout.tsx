import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
