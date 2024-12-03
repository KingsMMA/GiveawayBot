import type GiveawayBot from '../giveawayBot';

export default class {
    client: GiveawayBot;

    constructor(client: GiveawayBot) {
        this.client = client;
    }

    run() {
        console.info(`Successfully logged in! \nSession Details: id=${this.client.user?.id} tag=${this.client.user?.tag}`);
    }
}
