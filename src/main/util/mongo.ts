import type { Snowflake } from 'discord-api-types/globals';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';

import type { Giveaway } from '../../discord/giveawayBot';
import type Main from '../main';

export default class Mongo {
    private mongo!: Db;
    main: Main;
    constructor(main: Main) {
        this.main = main;
    }

    async connect() {
        const client = await MongoClient.connect(process.env.MONGO_URI!);
        this.mongo = client.db(this.main.config.mongo.database);
        console.info(`Connected to Database ${this.mongo.databaseName}`);

        console.info('Loading giveaways...');
        for (const guild of this.main.client.guilds.cache.values()) {
            const giveaways = await this.main.client.main.mongo.fetchGiveaways(guild.id);
            if (!giveaways) continue;

            const activeGiveaways = Object.fromEntries(
                Object.entries(giveaways)
                    .filter(([
                        url, giveaway
                    ]) => !giveaway.ended)
            );
            console.log(`Loaded ${Object.keys(activeGiveaways).length} active giveaways for guild ${guild.id} (${guild.name}).`);
            for (const [
                url, giveaway
            ] of Object.entries(activeGiveaways)) {
                this.main.client.scheduleGiveawayEnd(guild.id, url, giveaway.end_time);
            }
        }
    }

    async createGiveaway(guild_id: Snowflake, message_url: string, end_time: number, prize: string, winners: number, role?: Snowflake): Promise<void> {
        return void this.mongo.collection('giveaways')
            .updateOne(
                { guild_id: guild_id },
                { $set: { [`giveaways.${message_url.replace(/\./g, '[D]')}`]: { ended: false, end_time, prize, winners, role, entries: [] } } },
                { upsert: true });
    }

    async fetchGiveaways(guild_id: Snowflake): Promise<Record<string, Giveaway>> {
        return this.mongo.collection('giveaways')
            .findOne({ guild_id: guild_id })
            .then(doc => doc?.giveaways || {});
    }

    async fetchGiveaway(guild_id: Snowflake, message_url: string): Promise<Giveaway | null> {
        return this.mongo.collection('giveaways')
            .findOne({ guild_id: guild_id })
            .then(doc => doc?.giveaways[message_url.replace(/\./g, '[D]')] || null);
    }

    async enterGiveaway(guild_id: Snowflake, message_url: string, user_id: Snowflake): Promise<void> {
        return void this.mongo.collection('giveaways')
            .updateOne(
                { guild_id: guild_id },
                { $push: { [`giveaways.${message_url.replace(/\./g, '[D]')}.entries`]: user_id } });
    }

    async leaveGiveaway(guild_id: Snowflake, message_url: string, user_id: Snowflake): Promise<void> {
        return void this.mongo.collection('giveaways')
            .updateOne(
                { guild_id: guild_id },
                { $pull: { [`giveaways.${message_url.replace(/\./g, '[D]')}.entries`]: user_id } });
    }

    async updateGiveaway(guild_id: Snowflake, message_url: string, giveaway: Giveaway): Promise<void> {
        return void this.mongo.collection('giveaways')
            .updateOne(
                { guild_id: guild_id },
                { $set: { [`giveaways.${message_url.replace(/\./g, '[D]')}`]: giveaway } });
    }

}
