import chalk from 'chalk';
import type { InteractionResponse, Message } from 'discord.js';
import { CommandInteraction } from 'discord.js';

import KingsDevEmbedBuilder from './kingsDevEmbedBuilder';

const loggerInitialisedMessage = 'Logger initialised';

declare global {
    interface String {
        /**
         Converts a string to proper case.
         */
        toProperCase(): string;
    }

    interface Number {
        /**
         * Converts a number to ``X hours, Y minutes, Z seconds`` format.
         */
        formatTime(): string;
    }

    interface Date {
        /**
         * Converts a date to a discord timestamp.
         */
        toDiscord(format: 'relative' | 'HH:MM' | 'HH:MM:SS' | 'DD/MM/YYYY' | 'DD MMMM YYYY' | 'DD MMMM YYYY HH:MM' | 'dddd, DD MMMM YYYY HH:MM'): string;
    }

    interface Array<T> {
        /**
         * Checks if two arrays are equal.
         */
        equals(array: any[] | null): boolean;
    }
}

declare module 'discord.js' {
    interface CommandInteraction {
        replySuccess(message: string, ephemeral?: boolean): Promise<Message | InteractionResponse>;
        replyError(message: string, ephemeral?: boolean): Promise<Message | InteractionResponse>;
    }
}

String.prototype.toProperCase = function (this: string) {
    return this.split(' ')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(' ');
};

Number.prototype.formatTime = function () {
    const hours = Math.floor(this.valueOf() / 3600000);
    const minutes = Math.floor((this.valueOf() % 3600000) / 60000);
    const seconds = Math.floor(((this.valueOf() % 3600000) % 60000) / 1000);
    const components: string[] = [];
    if (hours > 0) components.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0)
        components.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
    if (seconds > 0)
        components.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
    return components.length === 0
        ? '0 seconds'
        : components.length === 1
            ? components[0]
            : components.length === 2
                ? `${components[0]} and ${components[1]}`
                : `${components[0]}, ${components[1]}, and ${components[2]}`;
};

Date.prototype.toDiscord = function (format) {
    switch (format) {
        case 'relative':
            return `<t:${Math.floor(this.valueOf() / 1000)}:R>`;
        case 'HH:MM':
            return `<t:${Math.floor(this.valueOf() / 1000)}:t>`;
        case 'HH:MM:SS':
            return `<t:${Math.floor(this.valueOf() / 1000)}:T>`;
        case 'DD/MM/YYYY':
            return `<t:${Math.floor(this.valueOf() / 1000)}:d>`;
        case 'DD MMMM YYYY':
            return `<t:${Math.floor(this.valueOf() / 1000)}:D>`;
        case 'DD MMMM YYYY HH:MM':
            return `<t:${Math.floor(this.valueOf() / 1000)}:f>`;
        case 'dddd, DD MMMM YYYY HH:MM':
            return `<t:${Math.floor(this.valueOf() / 1000)}:F>`;
    }
};

Array.prototype.equals = function (array) {
    if (this === array) return true;
    if (this == null || array == null) return false;
    if (this.length !== array.length) return false;

    let a = Object.assign([], this).toSorted();
    let b = Object.assign([], array).toSorted();
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

CommandInteraction.prototype.replySuccess = function (message: string, ephemeral?: boolean) {
    if (this.replied || !this.isRepliable() || this.deferred)
        return this.editReply({
            embeds: [
                new KingsDevEmbedBuilder()
                    .setColor('Green')
                    .setTitle('Success')
                    .setDescription(message)
            ],
        });
    else
        return this.reply({
            ephemeral: ephemeral,
            embeds: [
                new KingsDevEmbedBuilder()
                    .setColor('Green')
                    .setTitle('Success')
                    .setDescription(message)
            ],
        });
};

CommandInteraction.prototype.replyError = function (message: string, ephemeral?: boolean) {
    if (this.replied || !this.isRepliable() || this.deferred)
        return this.editReply({
            embeds: [
                new KingsDevEmbedBuilder()
                    .setColor('Red')
                    .setTitle('Error')
                    .setDescription(message)
            ],
        });
    else
        return this.reply({
            ephemeral: ephemeral,
            embeds: [
                new KingsDevEmbedBuilder()
                    .setColor('Red')
                    .setTitle('Error')
                    .setDescription(message)
            ],
        });
};

const real = {
    log: console.log,
    error: console.error,
};

console.log = (message?: any, ...optionalParams: any[]) => {
    const params = [
        message
    ];
    if (optionalParams.length) {
        params.push(...optionalParams);
    }
    for (let i = 0; i < params.length; i++) {
        if (typeof params[i] === 'string') {
            params[i] = chalk.blue(params[i]);
        }
    }
    real.log(chalk.red(`[${time()}] >`), ' ', ...params);
};

console.info = (message?: any, ...optionalParams: any[]) => {
    const params = [
        message
    ];
    if (optionalParams.length) {
        params.push(...optionalParams);
    }
    for (let i = 0; i < params.length; i++) {
        if (typeof params[i] === 'string') {
            params[i] = chalk.cyan(params[i]);
        }
    }
    real.log(chalk.red(`[${time()}] >`), ' ', ...params);
};

console.debug = (message?: any, ...optionalParams: any[]) => {
    const params = [
        message
    ];
    if (optionalParams.length) {
        params.push(...optionalParams);
    }
    real.log(chalk.red(`[${time()}] >`), ' ', chalk.blueBright(...params));
};

console.error = (e: Error) => {
    real.error(chalk.bgRedBright.white(`[${time()}] ERROR >`), ' ', chalk.red(e), chalk.red(e.stack));
};

function time() {
    return new Date()
        .toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
}

export default loggerInitialisedMessage;
