import type { ClientOptions, GuildTextBasedChannel } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Client, Collection } from 'discord.js';
import type { Snowflake } from 'discord-api-types/globals';
import type { PathLike } from 'fs';
import scheduler from 'node-schedule';
import path from 'path';

import type Main from '../main/main';
import type BaseCommand from './commands/base.command';
import KingsDevEmbedBuilder from './utils/kingsDevEmbedBuilder';

export type Giveaway = {
    ended: boolean,
    end_time: number,
    prize: string,
    winners: number,
    role?: Snowflake,
    entries: Snowflake[]
};

export default class GiveawayBot extends Client {
    main: Main;
    commands: Collection<string, BaseCommand> = new Collection();

    constructor(main: Main, options: ClientOptions) {
        super(options);
        this.main = main;
    }

    loadCommand(commandPath: PathLike, commandName: string) {
        try {
            const command: BaseCommand = new (require(`${commandPath}${path.sep}${commandName}`).default)(this);
            console.info(`Loading Command: ${command.name}.`);
            this.commands.set(command.name, command);
        } catch (e) {
            return `Unable to load command ${commandName}: ${e}`;
        }
    }

    loadEvent(eventPath: PathLike, eventName: string) {
        try {
            const event = new (require(`${eventPath}${path.sep}${eventName}`).default)(this);
            console.info(`Loading Event: ${eventName}.`);
            this.on(eventName, (...args) => event.run(...args));
        } catch (e) {
            return `Unable to load event ${eventName}: ${e}`;
        }
    }

    async giveawayEnded(guild_id: Snowflake, message_url: string) {
        const giveaway = (await this.main.mongo.fetchGiveaway(guild_id, message_url))!;

        giveaway.ended = true;
        await this.main.mongo.updateGiveaway(guild_id, message_url, giveaway);

        const url = message_url.split('/');
        const channel_id = url[5];
        const message_id = url[6];
        const channel = await this.channels.fetch(channel_id) as GuildTextBasedChannel;
        const message = await channel.messages.fetch(message_id);

        const entries = giveaway.entries.length;
        const winners = [];
        for (let i = 0; i < giveaway.winners; i++) {
            if (giveaway.entries.length === 0) break;
            const winner = giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];
            winners.push(winner);
            giveaway.entries = giveaway.entries.filter(entry => entry !== winner);
        }

        await message.edit({
            embeds: [
                new KingsDevEmbedBuilder()
                    .setTitle(giveaway.prize)
                    .setDescription(`This giveaway has ended\n\n**Winners:** ${giveaway.winners}\n**Ended:** ${new Date(giveaway.end_time)
                        .toDiscord('relative')}${giveaway.role ? `\n**Role requirement:** <@&${giveaway.role}>` : ''}`)
                    .setColor('Red')
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('giveaway:enter')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎉')
                            .setLabel(entries.toString())
                            .setDisabled(true)
                    )
            ]
        });

        if (winners.length === 0) return await message.reply('No one entered the giveaway, so there are no winners.');
        else await message.reply(`**:tada: Giveaway ended! :tada:**\n\n**Winners:** ${winners.map(winner => `<@${winner}>`).join(' ')
        }\n**Prize:** \`${giveaway.prize}\`\n\nCongratulations!`);
    }

    scheduleGiveawayEnd(guild_id: Snowflake, message_url: string, end_time: number) {
        const now = new Date();
        now.setSeconds(now.getSeconds() + 3);
        const end = new Date(end_time);
        if (now >= end) return void this.giveawayEnded(guild_id, message_url);
        else return void scheduler.scheduleJob(new Date(end_time), () => this.giveawayEnded(guild_id, message_url));
    }

}
