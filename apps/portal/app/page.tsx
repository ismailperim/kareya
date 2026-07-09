export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Kareya</h1>
      <p className="text-lg text-gray-500">
        AI-kadrolu web ajansı — kurulum aşaması.
      </p>
      <a href="/health" className="text-sm text-blue-600 underline">
        health check
      </a>
    </main>
  );
}
