import Link from "next/link";

type Tone = "red" | "yellow" | "green" | "blue" | "default";

function toneClasses(tone: Tone) {
  if (tone === "red") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (tone === "yellow") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-200";
  if (tone === "green") return "border-green-500/30 bg-green-500/10 text-green-200";
  if (tone === "blue") return "border-blue-500/30 bg-blue-500/10 text-blue-200";
  return "border-white/10 bg-zinc-900 text-white";
}

export default function OperationsAlertCard({
  title,
  value,
  description,
  href,
  tone = "default",
}: {
  title: string;
  value: string | number;
  description: string;
  href?: string;
  tone?: Tone;
}) {
  const content = (
    <div className={`rounded-3xl border p-5 transition ${toneClasses(tone)} ${href ? "hover:-translate-y-1 hover:border-red-500" : ""}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-80">
        {title}
      </p>
      <p className="mt-3 text-4xl font-black">{value}</p>
      <p className="mt-3 text-sm leading-6 opacity-80">{description}</p>
    </div>
  );

  if (!href) return content;

  return <Link href={href}>{content}</Link>;
}
