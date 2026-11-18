import type { Person } from "@/lib/data";

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl sm:size-24 sm:text-3xl",
};

// A round avatar with the initials of a person.
export default function Avatar({
  member,
  size = "md",
  className = "",
}: {
  member: Pick<Person, "initials" | "color">;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-on-accent ${sizes[size]} ${className}`}
      style={{ backgroundColor: member.color }}
    >
      {member.initials}
    </span>
  );
}
