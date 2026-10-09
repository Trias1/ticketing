export default function BlockedPage() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Akses Ditolak
        </h1>
        <p className="text-gray-600">
          Akun Anda telah dinonaktifkan. Silakan hubungi administrator.
        </p>
      </div>
    </div>
  );
}