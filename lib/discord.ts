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
 * Helper to post a Discord message with rate-limit (429) backoff and retries.
 */
async function postDiscordMessageWithRetry(
  endpoint: string,
  headers: Record<string, string>,
  body: FormData | string,
  isJson = false
): Promise<boolean> {
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: isJson ? { ...headers, 'Content-Type': 'application/json' } : headers,
        body,
      });

      if (res.ok) {
        return true;
      }

      if (res.status === 429) {
        let retryAfterMs = 1500;
        try {
          const rateData = await res.json();
          if (typeof rateData.retry_after === 'number') {
            retryAfterMs = Math.ceil(rateData.retry_after * 1000) + 250;
          }
        } catch {
          // fallback to 1.5s
        }
        console.warn(
          `[Memoir] Discord rate limit hit (429), waiting ${retryAfterMs}ms before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        continue;
      }

      const errorText = await res.text();
      console.warn(
        `[Memoir] Discord post attempt ${attempt} failed with status ${res.status}:`,
        errorText
      );
      break;
    } catch (err) {
      console.warn(`[Memoir] Discord post attempt ${attempt} network error:`, err);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

/**
 * Sends all developed memories to Discord in adaptive batches of up to 10 attachments
 * per message (honoring Discord's attachment limit), ensuring that whether 5, 10, or 54+
 * photos are uploaded, all photos are delivered to the Discord channel.
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

  try {
    const totalCount = items.length;
    // Discord API allows a maximum of 10 attachments per individual message
    const DISCORD_MAX_FILES_PER_MESSAGE = 10;
    const MAX_MESSAGE_BYTES = 24 * 1024 * 1024; // 24 MB safe threshold

    // Divide all items into chunks of up to 10
    const chunks: DiscordNotifyOptions[][] = [];
    for (let i = 0; i < items.length; i += DISCORD_MAX_FILES_PER_MESSAGE) {
      chunks.push(items.slice(i, i + DISCORD_MAX_FILES_PER_MESSAGE));
    }

    const totalBatches = chunks.length;
    let anySuccess = false;

    for (let b = 0; b < totalBatches; b++) {
      const batchItems = chunks[b];
      const partNum = b + 1;

      // Format contextual headline
      let headline = '';
      if (totalBatches === 1) {
        headline =
          totalCount === 1
            ? `🎞️ **A new ${items[0].kind === 'video' ? 'motion clip' : 'photograph'} was developed into Memoir:**`
            : `🎞️ **${totalCount} new memories were developed into Memoir:**`;
      } else {
        headline =
          b === 0
            ? `🎞️ **${totalCount} new memories were developed into Memoir (Part ${partNum}/${totalBatches}):**`
            : `🎞️ **Memoir memories (Part ${partNum}/${totalBatches}):**`;
      }

      // Concurrently fetch all files for this batch
      const fetchResults = await Promise.all(
        batchItems.map(async (item, idx) => {
          try {
            const resp = await fetch(item.url);
            if (!resp.ok) return null;
            const arrayBuffer = await resp.arrayBuffer();
            const contentType =
              resp.headers.get('content-type') ||
              (item.kind === 'video' ? 'video/mp4' : 'image/jpeg');
            const cleanFilename =
              item.filename?.replace(/[^a-zA-Z0-9._-]/g, '_') ||
              `memory_${b * DISCORD_MAX_FILES_PER_MESSAGE + idx + 1}.${item.kind === 'video' ? 'mp4' : 'jpg'}`;
            return {
              item,
              arrayBuffer,
              contentType,
              cleanFilename,
              size: arrayBuffer.byteLength,
            };
          } catch (fetchErr) {
            console.warn(`[Memoir] Failed to fetch file from ${item.url}:`, fetchErr);
            return null;
          }
        })
      );

      const successfulFiles = fetchResults.filter(
        (r): r is NonNullable<typeof r> => r !== null
      );
      const totalBatchBytes = successfulFiles.reduce((acc, f) => acc + f.size, 0);

      let batchPosted = false;

      // 1. Try multipart native attachment upload if files were downloaded and within 24MB
      if (successfulFiles.length === batchItems.length && totalBatchBytes <= MAX_MESSAGE_BYTES) {
        try {
          const formData = new FormData();
          const attachmentsMeta: { id: number; filename: string }[] = [];

          successfulFiles.forEach((file, i) => {
            const blob = new Blob([file.arrayBuffer], { type: file.contentType });
            attachmentsMeta.push({ id: i, filename: file.cleanFilename });
            formData.append(`files[${i}]`, blob, file.cleanFilename);
          });

          formData.append(
            'payload_json',
            JSON.stringify({
              content: headline,
              attachments: attachmentsMeta,
            })
          );

          batchPosted = await postDiscordMessageWithRetry(endpoint, headers, formData, false);
        } catch (multipartErr) {
          console.warn(`[Memoir] Multipart upload failed for batch ${partNum}:`, multipartErr);
        }
      }

      // 2. Fallback: If multipart failed or files exceeded size, send as embeds / formatted links
      if (!batchPosted) {
        try {
          const galleryTargetUrl = batchItems[0]?.url;
          const embeds = batchItems
            .filter((i) => i.kind === 'image')
            .slice(0, 10)
            .map((item, index) => {
              if (index === 0) {
                return {
                  title: `Memoir • Batch ${partNum}/${totalBatches} (${batchItems.length} items)`,
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
          batchItems.forEach((item) => {
            const icon = item.kind === 'video' ? '📹' : '📸';
            contentLines.push(`${icon} **${item.filename}** • ${item.kind === 'video' ? item.url : `<${item.url}>`}`);
          });

          const body = JSON.stringify({
            content: contentLines.join('\n'),
            embeds: embeds.length > 0 ? embeds : undefined,
          });

          batchPosted = await postDiscordMessageWithRetry(endpoint, headers, body, true);
        } catch (fallbackErr) {
          console.error(`[Memoir] Fallback embed post failed for batch ${partNum}:`, fallbackErr);
        }
      }

      if (batchPosted) {
        anySuccess = true;
      }

      // Pacing pause between batches so Discord doesn't rate-limit consecutive messages
      if (b < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    return anySuccess;
  } catch (err) {
    console.error('[Memoir] Discord adaptive batch notification error:', err);
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
