/**
 * Discord integration helper.
 * Posts newly developed memories to a private Discord channel
 * via Discord Bot Token or Discord Webhook.
 */

export interface DiscordNotifyOptions {
  filename: string;
  url: string;
  kind: 'image' | 'video';
  publicId?: string;
}

/**
 * Sends a single combined Discord message containing all attachments
 * uploaded in the current session.
 */
export async function sendBatchToDiscord(
  items: DiscordNotifyOptions[]
): Promise<boolean> {
  if (!items || items.length === 0) return false;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!botToken && !webhookUrl) {
    return false; // Neither bot nor webhook configured; silently skip
  }

  try {
    const photoItems = items.filter((i) => i.kind === 'image');
    const videoItems = items.filter((i) => i.kind === 'video');
    const totalCount = items.length;
    const headline =
      totalCount === 1
        ? `🎞️ **A new ${items[0].kind === 'video' ? 'motion clip' : 'photograph'} was developed into Memoir:**`
        : `🎞️ **${totalCount} new memories were developed into Memoir:**`;

    let endpoint = '';
    const headers: Record<string, string> = {};

    if (botToken && channelId) {
      endpoint = `https://discord.com/api/v10/channels/${channelId}/messages`;
      headers['Authorization'] = `Bot ${botToken}`;
    } else if (webhookUrl) {
      endpoint = webhookUrl;
    } else {
      console.warn('[Memoir] DISCORD_BOT_TOKEN is set, but DISCORD_CHANNEL_ID is missing.');
      return false;
    }

    // 1. Try sending as native multipart/form-data attachments so Discord renders them in the native collage/grid
    try {
      const formData = new FormData();
      const attachmentsMeta: { id: number; filename: string }[] = [];
      let totalBytes = 0;
      let allDownloaded = true;

      // Safe total payload ceiling for Discord file upload (25 MB)
      const MAX_TOTAL_BYTES = 24 * 1024 * 1024;

      // Attach up to 10 files per message (Discord limit)
      const filesToAttach = items.slice(0, 10);

      for (let i = 0; i < filesToAttach.length; i++) {
        const item = filesToAttach[i];
        const resp = await fetch(item.url);
        if (!resp.ok) {
          allDownloaded = false;
          break;
        }

        const arrayBuffer = await resp.arrayBuffer();
        totalBytes += arrayBuffer.byteLength;
        if (totalBytes > MAX_TOTAL_BYTES) {
          allDownloaded = false;
          break;
        }

        const contentType =
          resp.headers.get('content-type') ||
          (item.kind === 'video' ? 'video/mp4' : 'image/jpeg');

        const cleanFilename = item.filename || `memory_${i + 1}.${item.kind === 'video' ? 'mp4' : 'jpg'}`;
        const blob = new Blob([arrayBuffer], { type: contentType });

        attachmentsMeta.push({ id: i, filename: cleanFilename });
        formData.append(`files[${i}]`, blob, cleanFilename);
      }

      if (allDownloaded && attachmentsMeta.length > 0) {
        formData.append(
          'payload_json',
          JSON.stringify({
            content: headline,
            attachments: attachmentsMeta,
          })
        );

        const res = await fetch(endpoint, {
          method: 'POST',
          headers, // Do NOT manually set Content-Type so fetch includes boundary
          body: formData,
        });

        if (res.ok) {
          return true;
        }

        const errorText = await res.text();
        console.warn('[Memoir] Multipart grid upload to Discord failed, falling back to gallery embeds:', res.status, errorText);
      }
    } catch (attachmentErr) {
      console.warn('[Memoir] Error preparing native attachments for Discord grid:', attachmentErr);
    }

    // 2. Fallback: Embed Gallery Grid
    // Discord client aggregates multiple embeds into an image gallery grid when they share the exact same 'url'
    const galleryTargetUrl = photoItems[0]?.url || items[0]?.url;

    const embeds = photoItems.slice(0, 4).map((item, index) => {
      if (index === 0) {
        return {
          title: `Memoir • ${photoItems.length} new photos`,
          url: galleryTargetUrl,
          color: 0xc85a32,
          image: { url: item.url },
          timestamp: new Date().toISOString(),
        };
      }
      return {
        url: galleryTargetUrl,
        image: { url: item.url },
      };
    });

    const contentLines: string[] = [headline];
    items.forEach((item) => {
      const icon = item.kind === 'video' ? '📹' : '📸';
      contentLines.push(`${icon} **${item.filename}** • ${item.kind === 'video' ? item.url : `<${item.url}>`}`);
    });

    const body: Record<string, unknown> = {
      content: contentLines.join('\n'),
      embeds,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Memoir] Failed to post batch to Discord:', res.status, errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Memoir] Discord batch notification error:', err);
    return false;
  }
}

/**
 * Backward-compatible single item notifier.
 */
export async function sendToDiscord(options: DiscordNotifyOptions): Promise<boolean> {
  return sendBatchToDiscord([options]);
}

export interface SendPhotoStripOptions {
  buffer: Buffer | ArrayBuffer;
  filename: string;
  themeName?: string;
  layoutName?: string;
  caption?: string;
}

/**
 * Sends a newly crafted photobooth strip image directly to the configured Discord channel
 * as a native PNG attachment via the Discord Bot.
 */
export async function sendPhotoStripToDiscord(
  options: SendPhotoStripOptions
): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!botToken && !webhookUrl) {
    return { ok: false, error: 'Discord bot token or webhook not configured.' };
  }

  let endpoint = '';
  const headers: Record<string, string> = {};

  if (botToken && channelId) {
    endpoint = `https://discord.com/api/v10/channels/${channelId}/messages`;
    headers['Authorization'] = `Bot ${botToken}`;
  } else if (webhookUrl) {
    endpoint = webhookUrl;
  } else {
    return { ok: false, error: 'Discord channel ID missing.' };
  }

  try {
    const filename = options.filename || 'memoir-photo-strip.png';
    const isJpeg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
    const contentType = isJpeg ? 'image/jpeg' : 'image/png';
    const blob = new Blob([options.buffer as unknown as BlobPart], { type: contentType });

    const formData = new FormData();
    formData.append('files[0]', blob, filename);

    const messageLines = ['**A new photo strip was crafted in Memoir!**'];
    if (options.layoutName || options.themeName) {
      const details = [options.layoutName, options.themeName].filter(Boolean).join(' • ');
      messageLines.push(`*${details}*`);
    }
    if (options.caption && options.caption.trim()) {
      messageLines.push(`> "${options.caption.trim()}"`);
    }

    formData.append(
      'payload_json',
      JSON.stringify({
        content: messageLines.join('\n'),
        attachments: [
          {
            id: 0,
            filename,
            description: 'Memoir Photobooth Strip',
          },
        ],
      })
    );

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Memoir] Failed to send photo strip to Discord:', res.status, errText);
      return { ok: false, error: `Discord API returned ${res.status}` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Network error';
    console.error('[Memoir] Discord photo strip error:', err);
    return { ok: false, error: errMsg };
  }
}
