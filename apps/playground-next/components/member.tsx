type MemberCardProps = {
  name: string;
  role: string;
  initials: string;
};

export default function MemberCard({ name, role, initials }: MemberCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-background">
        {initials}
      </div>
      <div className="flex flex-col">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-sm text-muted">{role}</p>
      </div>
    </div>
  );
}
