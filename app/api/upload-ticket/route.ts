import { NextRequest, NextResponse } from "next/server";
import cloudinary from "db/cloudinary";
import { limitUser, requireUser } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  // Tolak body besar SEBELUM dibaca ke memori (batas file + sedikit ruang untuk multipart).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (!declared || declared > 5 * 1024 * 1024 + 64 * 1024) {
    return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 413 });
  }
  const limited = await limitUser(userLimits.upload(auth.user.id));
  if (limited) return limited;

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported image format (JPG, PNG, or WEBP only)" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "tickets",
            // Cloudinary memeriksa isi file, bukan hanya tipe yang dikirim browser.
            resource_type: "image",
            allowed_formats: ["jpg", "png", "webp"],
          },
          (err, res) => {
            if (err || !res) return reject(err);
            resolve(res);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
