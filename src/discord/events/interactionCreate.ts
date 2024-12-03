import {ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction} from 'discord.js';

import type GiveawayBot from '../giveawayBot';

export default class {
    client: GiveawayBot;
    constructor(client: GiveawayBot) {
        this.client = client;
    }

    async run(interaction: Interaction) {
        if (interaction.isCommand()) {
            if (!interaction.guild) return interaction.replyError('This command can only be used in a server.');

            const command = this.client.commands.get(interaction.commandName);
            if (!command) return;

            if (!command.opts.enabled) {
                return interaction.reply({
                    content: 'This command is currently disabled.',
                    ephemeral: true,
                });
            }

            return command.execute(interaction);
        } else if (interaction.isAutocomplete()) {
            const command = this.client.commands.get(interaction.commandName);
            if (!command) return;
            return command.autocomplete(interaction);
        } else if (interaction.isButton()) {
            if (interaction.customId === 'giveaway:enter') {
                await interaction.deferReply({ ephemeral: true });

                const giveaway = await this.client.main.mongo.fetchGiveaway(interaction.guildId!, interaction.message.url);
                if (!giveaway) return interaction.replyError('This giveaway does not exist.');

                if (giveaway.ended) return interaction.replyError('This giveaway has ended.');

                const member = await interaction.guild!.members.fetch(interaction.user.id);
                if (!member) return interaction.replyError('You are not in this server.');

                if (giveaway.role) {
                    const hasRole = member.roles.cache.has(giveaway.role);
                    if (!hasRole) return interaction.replyError('You do not have the required role to enter this giveaway.');
                }

                if (giveaway.entries.includes(interaction.user.id)) {
                    return interaction.editReply({
                        content: 'You have already entered this giveaway.',
                        components: [
                            new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`giveaway:leave:${interaction.message.id}`)
                                        .setStyle(ButtonStyle.Danger)
                                        .setLabel('Leave Giveaway')
                                )
                        ],
                    });
                }

                await this.client.main.mongo.enterGiveaway(interaction.guildId!, interaction.message.url, interaction.user.id);
                await interaction.replySuccess('You have entered the giveaway.');
                await interaction.message.edit({
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('giveaway:enter')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji('🎉')
                                    .setLabel((giveaway.entries.length + 1).toString())
                            )
                    ],
                });
            } else if (interaction.customId.startsWith('giveaway:leave:')) {
                await interaction.deferReply({ ephemeral: true });
                const message = await interaction.channel!.messages.fetch(interaction.customId.split(':')[2]);
                if (!message) return interaction.replyError('This giveaway does not exist.');

                const giveaway = await this.client.main.mongo.fetchGiveaway(interaction.guildId!, message.url);
                if (!giveaway) return interaction.replyError('This giveaway does not exist.');

                if (giveaway.ended) return interaction.replyError('This giveaway has ended.');

                if (!giveaway.entries.includes(interaction.user.id))
                    return interaction.replyError('You have not entered this giveaway.');

                await this.client.main.mongo.leaveGiveaway(interaction.guildId!, message.url, interaction.user.id);
                await interaction.replySuccess('You have left the giveaway.');
                await message.edit({
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('giveaway:enter')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji('🎉')
                                    .setLabel((giveaway.entries.length - 1).toString())
                            )
                    ],
                });
            }
        }
    }
}
