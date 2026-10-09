import { loadEnvConfig } from '@next/env';
import { neon } from '@neondatabase/serverless';

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL!);

sql`select now() as now`
  .then((rows) => {
    console.log('Koneksi ke database berhasil!', rows[0].now);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Gagal konek ke database:', err);
    process.exit(1);
  });
