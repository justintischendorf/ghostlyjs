export default function MemberCard() {
  return (
    <div className="flex gap-4 border border-accent/50 rounded-2xl items-center px-4 py-2">
      <div className="sm:w-16 sm:h-16 h-10 w-10 bg-accent rounded-full shrink-0"></div>
      <div className="flex flex-col">
        <h1 className="sm:text-lg text-base font-bold">Peter Parker</h1>
        <p className="sm:text-sm text-xs">2000-01-01</p>
      </div>
    </div>
  );
}
