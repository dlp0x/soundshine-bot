import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embedHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles selon votre rôle'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute (interaction) {
    const isAdmin = interaction.member.roles.cache.some(role =>
      ['Admin', 'Administrateur', 'Modérateur'].includes(role.name));

    const { commands } = interaction.client;
    const visibleCommands = [...commands.values()].filter(cmd => {
      return !(cmd.adminOnly && !isAdmin);
    });

    const helpList = visibleCommands
      .map(cmd => `</${cmd.data.name}:${cmd.data.name}> — ${cmd.data.description}`)
      .join('\n');

    const embed = createEmbed({
      title: '📘 Aide — Commandes disponibles',
      description: helpList || 'Aucune commande disponible.',
      footer: { text: `Demandé par ${interaction.user.username}` }
    });

    return {
      success: true,
      message: null,
      embeds: [embed],
      ephemeral: true
    };
  }
};
