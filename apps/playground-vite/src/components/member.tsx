type MemberCardProps = {
  name: string;
  role: string;
  initials: string;
  // A centered column instead of a row from xl on, for narrow grid columns.
  stacked?: boolean;
};

export default function MemberCard({
  name,
  role,
  initials,
  stacked = false,
}: MemberCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-4 lg:p-5 ${
        stacked ? "xl:flex-col xl:text-center" : ""
      }`}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent sm:size-12 sm:text-base 2xl:size-14">
        {initials}
      </div>
      <div className="flex flex-col">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-sm text-muted">{role}</p>
      </div>
    </div>
  );
}
