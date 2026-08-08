import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { searchSongs } from '#api/services/radioDjApi.js';
import logger from '#shared/logging/logger.js';

const MAX_BUTTONS_PER_ROW = 5;

export default {
  builder: (subcommand) =>
    subcommand
      .setName('search')
      .setDescription('Rechercher un morceau dans RadioDJ')
      .addStringOption((option) =>
        option
          .setName('query')
          .setDescription('Titre ou artiste')
          .setRequired(true))
      .addIntegerOption((option) =>
        option
          .setName('limit')
          .setDescription('Nombre de resultats (max 10)')
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(false)),

  async execute (interaction) {
    try {
      const query = interaction.options.getString('query');
      const limit = interaction.options.getInteger('limit') ?? 5;

      const songs = await searchSongs(query, limit);

      if (songs.length === 0) {
        return await interaction.reply({
          content: 'Aucun resultat trouve.',
          flags: MessageFlags.Ephemeral
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`Resultats pour "${query}"`)
        .setDescription(
          songs
            .map((song, index) => `**${index + 1}.** ${song.artist} - ${song.title}`)
            .join('\n')
        )
        .setFooter({ text: 'Clique sur un bouton pour faire ta demande.' });

      const rows = [];
      for (let i = 0; i < songs.length; i += MAX_BUTTONS_PER_ROW) {
        const chunk = songs.slice(i, i + MAX_BUTTONS_PER_ROW);
        rows.push(
          new ActionRowBuilder().addComponents(
            chunk.map((song, chunkIndex) =>
              new ButtonBuilder()
                .setCustomId(`request_add_${song.ID}`)
                .setLabel(`Demander #${i + chunkIndex + 1}`)
                .setStyle(ButtonStyle.Primary))
          )
        );
      }

      return await interaction.reply({
        embeds: [embed],
        components: rows,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error('Erreur lors de la recherche de morceaux via l\'API:', error);
      return await interaction.reply({
        content: 'Erreur lors de la recherche via l\'API.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
