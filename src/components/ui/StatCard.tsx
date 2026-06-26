interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: "primary" | "blue" | "green" | "yellow" | "red";
}

const colorMap = {
  primary: "bg-[#b3000015] text-[var(--accent-primary)]",
  blue: "bg-[rgba(37,99,235,0.1)] text-[var(--accent-blue)]",
  green: "bg-[rgba(34,197,94,0.1)] text-[var(--accent-green)]",
  yellow: "bg-[rgba(245,158,11,0.1)] text-[var(--accent-yellow)]",
  red: "bg-[rgba(239,68,68,0.1)] text-[var(--accent-red)]",
};

export default function StatCard({ label, value, icon, color = "primary" }: StatCardProps) {
  return (
    <div className="ios-card p-3.5 flex items-center gap-3">
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${colorMap[color]} flex items-center justify-center`}>
        <div className="w-[18px] h-[18px]">{icon}</div>
      </div>
      <div>
        <p className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">{value.toLocaleString()}</p>
        <p className="text-[11px] text-[var(--text-secondary)] font-medium">{label}</p>
      </div>
    </div>
  );
}
