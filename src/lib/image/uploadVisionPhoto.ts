import type { SupabaseClient } from "@supabase/supabase-js";
import { optimizeImage } from "./optimizeImage";

export interface VisionPhotoResult {
  publicUrl: string;
  thumbnailUrl: string;
  storagePath: string;
}

/**
 * ビジョンフォトをアップロードする
 * 1. クライアントサイドで最大1600px・WebP変換
 * 2. オリジナルとサムネイル(400px)を Storage にアップロード
 * 3. storage_files テーブルにメタデータを保存
 * 4. publicUrl と thumbnailUrl を返す
 */
export async function uploadVisionPhoto(
  supabase: SupabaseClient,
  userId: string,
  roleId: string,
  file: File
): Promise<VisionPhotoResult> {
  const { original, thumbnail, width, height, mimeType } = await optimizeImage(file);

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const basePath = `${userId}/roles/${roleId}`;
  const mainPath = `${basePath}/vision.${ext}`;
  const thumbPath = `${basePath}/vision_thumb.${ext}`;

  // 既存ファイルを上書きアップロード
  await Promise.all([
    supabase.storage.from("vision-photos").upload(mainPath, original, {
      upsert: true,
      contentType: mimeType,
    }),
    supabase.storage.from("vision-photos").upload(thumbPath, thumbnail, {
      upsert: true,
      contentType: mimeType,
    }),
  ]);

  const { data: { publicUrl } } = supabase.storage.from("vision-photos").getPublicUrl(mainPath);
  const { data: { publicUrl: thumbnailUrl } } = supabase.storage.from("vision-photos").getPublicUrl(thumbPath);

  // メタデータをDBに保存（UNIQUE entity_type+entity_id でupsert）
  await supabase.from("storage_files").upsert(
    {
      user_id: userId,
      storage_path: mainPath,
      public_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      mime_type: mimeType,
      file_size_bytes: original.size,
      width,
      height,
      entity_type: "role_vision",
      entity_id: roleId,
    },
    { onConflict: "entity_type,entity_id" }
  );

  return { publicUrl, thumbnailUrl, storagePath: mainPath };
}

/**
 * ビジョンフォトを削除する（StorageとDBの両方を削除）
 */
export async function deleteVisionPhoto(
  supabase: SupabaseClient,
  userId: string,
  roleId: string
): Promise<void> {
  // storage_files から既存パスを取得
  const { data: meta } = await supabase
    .from("storage_files")
    .select("storage_path")
    .eq("entity_type", "role_vision")
    .eq("entity_id", roleId)
    .single();

  const pathsToDelete: string[] = [];

  if (meta?.storage_path) {
    pathsToDelete.push(meta.storage_path);
    // サムネイルパスを推定（`vision.webp` → `vision_thumb.webp`）
    const thumbPath = meta.storage_path.replace(/vision\.(\w+)$/, "vision_thumb.$1");
    pathsToDelete.push(thumbPath);
  } else {
    // フォールバック：よく使われるパスを試みる
    const base = `${userId}/roles/${roleId}`;
    pathsToDelete.push(`${base}/vision.webp`, `${base}/vision_thumb.webp`, `${base}/vision.jpg`);
  }

  await supabase.storage.from("vision-photos").remove(pathsToDelete);
  await supabase.from("storage_files")
    .delete()
    .eq("entity_type", "role_vision")
    .eq("entity_id", roleId);
}
