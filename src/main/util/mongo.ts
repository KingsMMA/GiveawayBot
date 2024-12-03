import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';

import type Main from '../main';
import {Snowflake} from "discord-api-types/globals";

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
    }

    async createGiveaway(guild_id: Snowflake, message_url: string, end_time: number, prize: string, winners: number, role?: Snowflake): Promise<void> {
        return void this.mongo.collection("giveaways")
            .updateOne(
                { guild_id: guild_id },
                { $set: { [`giveaways.${message_url.replace(/\./g, '[D]')}`]: { ended: false, end_time, prize, winners, role, entries: [] } } },
                { upsert: true });
    }

    async fetchGiveaways(guild_id: Snowflake): Promise<{ ended: boolean, end_time: number, prize: string, winners: number, role?: Snowflake, entries: Snowflake[] }[]> {
        return this.mongo.collection("giveaways")
            .findOne({ guild_id: guild_id })
            .then((doc) => Object.values(doc?.giveaways || {}));
    }

    async fetchGiveaway(guild_id: Snowflake, message_url: string): Promise<{ ended: boolean, end_time: number, prize: string, winners: number, role?: Snowflake, entries: Snowflake[] } | null> {
        return this.mongo.collection("giveaways")
            .findOne({ guild_id: guild_id })
            .then((doc) => doc?.giveaways[message_url.replace(/\./g, '[D]')] || null);
    }

    async enterGiveaway(guild_id: Snowflake, message_url: string, user_id: Snowflake): Promise<void> {
        return void this.mongo.collection("giveaways")
            .updateOne(
                { guild_id: guild_id },
                { $push: { [`giveaways.${message_url.replace(/\./g, '[D]')}.entries`]: user_id } });
    }

    async leaveGiveaway(guild_id: Snowflake, message_url: string, user_id: Snowflake): Promise<void> {
        return void this.mongo.collection("giveaways")
            .updateOne(
                { guild_id: guild_id },
                { $pull: { [`giveaways.${message_url.replace(/\./g, '[D]')}.entries`]: user_id } });
    }

}
