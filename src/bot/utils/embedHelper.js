import { EmbedBuilder } from 'discord.js';

/**
 * Crée un embed Discord standardisé pour Soundshine
 * @param {{
 *   title?: string,
 *   description?: string,
 *   fields?: { name: string, value: string, inline?: boolean }[],
 *   color?: number | string,
 *   footer?: { text: string, iconURL?: string },
 *   timestamp?: boolean
 * }} options
 * @returns {EmbedBuilder}
 */
export function createEmbed (options = {}) {
  const {
    title,
    description,
    fields = [],
    color = 0x00b2ff, // Bleu Soundshine ?
    footer = { text: 'Soundshine Bot' },
    timestamp = true
  } = options;

  const embed = new EmbedBuilder();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (color) embed.setColor(color);
  if (footer) embed.setFooter(footer);
  if (timestamp) embed.setTimestamp();

  return embed;
}
