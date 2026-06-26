export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#faf8f2] z-[999]">
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute w-16 h-16 border-4 border-[#b3000020] rounded-full"></div>
        <div className="absolute w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-[13px] font-medium text-[var(--text-secondary)] animate-pulse">
        Memuat data...
      </p>
    </div>
  );
}
