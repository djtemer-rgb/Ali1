export default function Loading() {
  return (
    <div
      className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800"
      style={{
        backgroundImage:
          "radial-gradient(circle at top, rgba(59,130,246,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(139,92,246,0.08), transparent 25%)",
      }}
    >
      <header className="bg-white px-4 md:px-6 py-3 md:py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-40 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 w-32 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-20 rounded-xl bg-amber-100 animate-pulse border border-amber-200" />
      </header>

      <nav className="flex gap-2 md:gap-3 px-4 md:px-6 py-4 md:py-6 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
        <div className="h-12 w-36 rounded-2xl bg-white animate-pulse shadow-sm" />
        <div className="h-12 w-32 rounded-2xl bg-white animate-pulse shadow-sm" />
        <div className="h-12 w-36 rounded-2xl bg-white animate-pulse shadow-sm" />
        <div className="h-12 w-36 rounded-2xl bg-white animate-pulse shadow-sm" />
      </nav>

      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-4 md:space-y-6">
        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm border border-slate-100 min-h-[200px]">
          <div className="h-8 w-56 rounded-full bg-slate-100 animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        </section>

        <section className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-lg shadow-indigo-200 min-h-[220px]">
          <div className="h-8 w-52 rounded-full bg-white/15 animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            <div className="h-32 rounded-2xl bg-white/15 animate-pulse" />
            <div className="h-32 rounded-2xl bg-white/15 animate-pulse" />
            <div className="h-32 rounded-2xl bg-white/15 animate-pulse" />
          </div>
        </section>
      </main>
    </div>
  );
}
