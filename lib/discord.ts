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

export async function sendToDiscord({
  filename,
  url,
  kind,
}: DiscordNotifyOptions): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!botToken && !webhookUrl) {
    return false; // Neither bot nor webhook configured; silently skip
  }

  try {
    const isVideo = kind === 'video';

    // Discord message payload
    const body: Record<string, unknown> = {
      content: isVideo
        ? `🎞️ **A new video was developed into Memoir:** \`${filename}\`\n${url}`
        : `🎞️ **A new photo was developed into Memoir:** \`${filename}\``,
      embeds: isVideo
        ? []
        : [
            {
              title: filename,
              url: url,
              color: 0xc85a32, // Vintage rust accent
              image: {
                url: url,
              },
              footer: {
                text: 'Memoir • Private Reel',
              },
              timestamp: new Date().toISOString(),
            },
          ],
    };

    let endpoint = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (botToken && channelId) {
      // Post officially as the Discord Bot via Discord REST API v10
      endpoint = `https://discord.com/api/v10/channels/${channelId}/messages`;
      headers['Authorization'] = `Bot ${botToken}`;
    } else if (webhookUrl) {
      // Fallback: Webhook URL
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
      console.error('[Memoir] Failed to post to Discord:', res.status, errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Memoir] Discord notification error:', err);
    return false;
  }
}
