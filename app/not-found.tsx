import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-[28px] shadow-lg border border-slate-100 p-6 md:p-8 text-center">
        <div className="text-3xl mb-3">🧭</div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Страница не найдена</h1>
        <p className="text-slate-500 text-sm md:text-base mb-5">
          Похоже, маршрут временно недоступен или был введён неверно.
        </p>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center bg-[#3B82F6] text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
