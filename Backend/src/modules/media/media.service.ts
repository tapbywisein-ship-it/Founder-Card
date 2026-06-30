import { supabaseAdmin } from '@config/supabase';
import { env } from '@config/env';
import logger from '@utils/logger';

export class MediaService {
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
    bucket?: string
  ): Promise<string> {
    const targetBucket = bucket ?? env.SUPABASE_STORAGE_AVATAR_BUCKET;

    const { error } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(key, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      logger.error('Supabase Storage upload failed', {
        key,
        bucket: targetBucket,
        error: error.message,
      });
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return this.getPublicUrl(key, targetBucket);
  }

  async deleteFile(url: string, bucket?: string): Promise<void> {
    const key = this.extractKeyFromUrl(url);
    const targetBucket = bucket ?? this.guessBucket(url);

    const { error } = await supabaseAdmin.storage.from(targetBucket).remove([key]);

    if (error) {
      logger.warn('Supabase Storage delete failed', {
        key,
        bucket: targetBucket,
        error: error.message,
      });
    }
  }

  getPublicUrl(key: string, bucket?: string): string {
    const targetBucket = bucket ?? env.SUPABASE_STORAGE_AVATAR_BUCKET;
    const { data } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(key);
    return data.publicUrl;
  }

  private guessBucket(url: string): string {
    if (url.includes(`/${env.SUPABASE_STORAGE_COVER_BUCKET}/`)) {
      return env.SUPABASE_STORAGE_COVER_BUCKET;
    }
    return env.SUPABASE_STORAGE_AVATAR_BUCKET;
  }

  private extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Supabase Storage public URLs look like:
      // https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
      const parts = urlObj.pathname.split('/');
      const bucketIdx = parts.indexOf('public') + 1;
      return parts.slice(bucketIdx + 1).join('/');
    } catch {
      return url;
    }
  }
}

export default new MediaService();
