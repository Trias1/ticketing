// Tautan publik project (halaman home dan footer).
export const REPO_URL = "https://github.com/Trias1/ticketing";

// Alamat demo publik (diisi di instance utama lewat NEXT_PUBLIC_DEMO_URL). Kosong = tidak ada tombol demo.
export const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL || null;

export const docsUrl = (file: string) => `${REPO_URL}/blob/main/docs/${file}`;
