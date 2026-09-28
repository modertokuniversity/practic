import { initials } from "@/lib/utils";

export function Avatar({
  name,
  color = "#7C3AED",
  size = 32,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
