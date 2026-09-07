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

    // Headline
    const headline =
      totalCount === 1
        ? `🎞️ **A new ${items[0].kind === 'video' ? 'motion clip' : 'photograph'} was developed into Memoir:**`
        : `🎞️ **${totalCount} new memories were developed into Memoir:**`;

    // Itemized lines with direct attachment links
    const contentLines: string[] = [headline];

    items.forEach((item) => {
      const icon = item.kind === 'video' ? '📹' : '📸';
      // For videos, raw URL allows Discord video player to embed.
      // For images, <URL> keeps clean link without duplicating embed if embeds exist.
      const formattedUrl = item.kind === 'video' ? item.url : `<${item.url}>`;
      contentLines.push(`${icon} **${item.filename}** • ${formattedUrl}`);
    });

    // Up to 10 embeds for photos (Discord limit is 10 embeds per message)
    const embeds = photoItems.slice(0, 10).map((item, index) => ({
      title: item.filename,
      url: item.url,
      color: 0xc85a32, // Vintage rust accent
      image: {
        url: item.url,
      },
      footer: {
        text: `Memoir • Photo ${index + 1} of ${photoItems.length}`,
      },
      timestamp: new Date().toISOString(),
    }));

    const body: Record<string, unknown> = {
      content: contentLines.join('\n'),
      embeds,
    };

    let endpoint = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (botToken && channelId) {
      endpoint = `https://discord.com/api/v10/channels/${channelId}/messages`;
      headers['Authorization'] = `Bot ${botToken}`;
    } else if (webhookUrl) {
      endpoint = webhookUrl;
    } else {
      console.warn('[Memoir] DISCORD_BOT_TOKEN is set, but DISCORD_CHANNEL_ID is missing.');
      return false;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
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
