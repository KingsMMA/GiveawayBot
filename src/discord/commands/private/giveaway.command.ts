import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction
} from 'discord.js';
import { PermissionsBitField } from 'discord.js';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

import type GiveawayBot from '../../giveawayBot';
import KingsDevEmbedBuilder from '../../utils/kingsDevEmbedBuilder';
import BaseCommand from '../base.command';
import {Snowflake} from "discord-api-types/globals";

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
            ],
        });
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        switch (interaction.options.getSubcommand()) {
            case "start":
                return this.startGiveaway(interaction);
            default:
                return interaction.replyError("Invalid subcommand.");
        }
    }

    async startGiveaway(interaction: ChatInputCommandInteraction) {
        const prize = interaction.options.getString('prize', true);
        const duration = interaction.options.getString('duration', true);
        const winners = interaction.options.getInteger('winners', true);
        const channelOption = interaction.options.getChannel('channel') || interaction.channel!;
        const role = interaction.options.getRole('role');
        const message = interaction.options.getString('message') || '';

        let channel = await interaction.guild!.channels.fetch(channelOption.id);
        if (!channel)
            return interaction.replyError("The channel could not be found.");
        if (!channel.isTextBased() || channel.isVoiceBased())
            return interaction.replyError("The channel must be a text channel.");

        if (role && !interaction.guild!.roles.cache.has(role.id))
            return interaction.replyError("The role could not be found.");

        const endDate = this.durationToEndDate(duration);

        let giveawayMessage = await channel.send({
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
                    .setTitle("Giveaway Started")
                    .setDescription(`The giveaway for **${prize}** has started in <#${channel.id}>.\n[Jump to Message](${giveawayMessage.url})`)
                    .setColor('Green')
            ]
        });

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
