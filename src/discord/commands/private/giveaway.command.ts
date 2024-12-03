import type {
    ChatInputCommandInteraction, GuildTextBasedChannel
} from 'discord.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { PermissionsBitField } from 'discord.js';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

import type GiveawayBot from '../../giveawayBot';
import KingsDevEmbedBuilder from '../../utils/kingsDevEmbedBuilder';
import BaseCommand from '../base.command';

export default class GiveawayCommand extends BaseCommand {
    constructor(client: GiveawayBot) {
        super(client, {
            name: 'giveaway',
            description: 'Manages giveaways',
            type: ApplicationCommandType.ChatInput,
            default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
            options: [
                {
                    name: 'start',
                    description: 'Start a giveaway.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'prize',
                            description: 'The prize of the giveaway.',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: 'duration',
                            description: 'The duration of the giveaway. (Ex: 1d 2h 3m 4s)',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: 'winners',
                            description: 'The amount of winners.',
                            type: ApplicationCommandOptionType.Integer,
                            required: true,
                        },
                        {
                            name: 'channel',
                            description: 'The channel to send the giveaway in.',
                            type: ApplicationCommandOptionType.Channel,
                        },
                        {
                            name: 'role',
                            description: 'The role to require to enter the giveaway.',
                            type: ApplicationCommandOptionType.Role,
                        },
                        {
                            name: 'message',
                            description: 'The message to send with the giveaway.',
                            type: ApplicationCommandOptionType.String,
                        },
                    ],
                },
                {
                    name: 'reroll',
                    description: 'Reroll a giveaway.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'message_url',
                            description: 'The message url of the giveaway.',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: 'winners',
                            description: 'The amount of winners to reroll.',
                            type: ApplicationCommandOptionType.Integer,
                        },
                    ],
                },
            ],
        });
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        switch (interaction.options.getSubcommand()) {
            case 'start':
                return this.startGiveaway(interaction);
            case 'reroll':
                return this.rerollGiveaway(interaction);
            default:
                return interaction.replyError('Invalid subcommand.');
        }
    }

    async startGiveaway(interaction: ChatInputCommandInteraction) {
        const prize = interaction.options.getString('prize', true);
        const duration = interaction.options.getString('duration', true);
        const winners = interaction.options.getInteger('winners', true);
        const channelOption = interaction.options.getChannel('channel') || interaction.channel!;
        const role = interaction.options.getRole('role');
        const message = interaction.options.getString('message') || '';

        const channel = await interaction.guild!.channels.fetch(channelOption.id)
            .catch(() => undefined);
        if (!channel)
            return interaction.replyError('The channel could not be found.');
        if (!channel.isTextBased() || channel.isVoiceBased())
            return interaction.replyError('The channel must be a text channel.');

        if (role && !interaction.guild!.roles.cache.has(role.id))
            return interaction.replyError('The role could not be found.');

        if (winners < 1)
            return interaction.replyError('There must be at least 1 winner.');

        const endDate = this.durationToEndDate(duration);

        const giveawayMessage = await channel.send({
            content: message,
            embeds: [
                new KingsDevEmbedBuilder()
                    .setTitle(prize)
                    .setDescription(`Click the button below to enter.\n\n**Winners:** ${winners}\n**Ends:** ${endDate.toDiscord('relative')}${role ? `\n**Role requirement:** <@&${role.id}>` : ''}`)
                    .setColor('Blurple')
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('giveaway:enter')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎉')
                            .setLabel('0')
                    )
            ]
        });

        await this.client.main.mongo.createGiveaway(
            interaction.guildId!,
            giveawayMessage.url,
            endDate.getTime(),
            prize,
            winners,
            role?.id
        );
        this.client.scheduleGiveawayEnd(interaction.guildId!, giveawayMessage.url, endDate.getTime());

        return interaction.editReply({
            embeds: [
                new KingsDevEmbedBuilder()
                    .setTitle('Giveaway Started')
                    .setDescription(`The giveaway for **${prize}** has started in <#${channel.id}>.\n[Jump to Message](${giveawayMessage.url})`)
                    .setColor('Green')
            ]
        });

    }

    async rerollGiveaway(interaction: ChatInputCommandInteraction) {
        const messageUrl = interaction.options.getString('message_url', true);
        const winners = interaction.options.getInteger('winners') || 1;

        const giveaway = await this.client.main.mongo.fetchGiveaway(interaction.guildId!, messageUrl);
        if (!giveaway)
            return interaction.replyError('The giveaway could not be found.');

        const channel_id = messageUrl.split('/')
            .slice(-2)[0];
        const message_id = messageUrl.split('/')
            .slice(-1)[0];
        const channel = await interaction.guild!.channels.fetch(channel_id)
            .catch(() => undefined);
        if (!channel)
            return interaction.replyError('The channel could not be found.');

        const giveawayMessage = await (channel as GuildTextBasedChannel).messages.fetch(message_id)
            .catch(() => undefined);
        if (!giveawayMessage)
            return interaction.replyError('The giveaway message could not be found.');

        const entries = await this.client.main.mongo.fetchGiveaway(interaction.guildId!, messageUrl)
            .then(giveaway => giveaway?.entries || []);
        if (entries.length < winners)
            return interaction.replyError('There are not enough entries to reroll that many winners.');

        const winnersList = entries
            .sort(() => Math.random() - 0.5)
            .slice(0, winners)
            .map(entry => `<@${entry}>`);

        await giveawayMessage.reply(`**:tada: Giveaway rerolled! :tada:**\n\n**New winners:** ${winnersList.join(' ')
        }\n**Prize:** \`${giveaway.prize}\`\n\nCongratulations!`);

        return interaction.replySuccess(`The giveaway has been rerolled with \`${winnersList.length}\` winners.`);
    }

    durationToEndDate(duration: string): Date {
        const regex = /(?:(\d+)d)? ?(?:(\d+)h)? ?(?:(\d+)m)? ?(?:(\d+)s)?/g;
        const matches = regex.exec(duration);
        if (!matches) return new Date();

        const days = parseInt(matches[1]) || 0;
        const hours = parseInt(matches[2]) || 0;
        const minutes = parseInt(matches[3]) || 0;
        const seconds = parseInt(matches[4]) || 0;

        const now = new Date();
        now.setDate(now.getDate() + days);
        now.setHours(now.getHours() + hours);
        now.setMinutes(now.getMinutes() + minutes);
        now.setSeconds(now.getSeconds() + seconds);
        return now;
    }
}
