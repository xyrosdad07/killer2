const { executeOneOperationOk, accpetedFormats } = require('../../index');
const { Collection } = require('discord.js');
const { Context } = require('telegraf')
const { EventEmitter } = require('events');
const { adminNamesForTelegramBot } = require('../../config');
class messageHandler extends EventEmitter {
    /**
     * 
     * @param {import('./bot').TelegramBot} client 
     */
    constructor(client) {
        super();
        this.name = 'message';
        this.client = client;
        /**
         * @type {Collection<number,  true>}
         */
        this.ratelimits = new Collection();
        /**
         * @type {Collection<number, number>}
         */
        this.cooldowns = new Collection();

    };

    handle() {
        this.on('message', async (...args) => {
            await this.run(...args);
        });
    };

    /**
     * @param {Context } context
     */
    async run(context) {
        if (!context) return;
        if (context.from.is_bot || context.from.is_bot === context.botInfo.id) return context.reply('Bots are not allowed to use this bot!');
        if (this.client.accessUsers.includes(context.from.username)) {
            if (!context.from.id) return await context.reply('Sorry, I did not understand your message! Please use the command /help to get started.');
            if (this.ratelimit(context)) {
                console.log(`User Rate Limited: ${context.from.username} | hehehe `)
                return await context.reply('Please wait for the previous request to be processed!');
            };
            const cool_down = this.cooldown(context);
            if (typeof cool_down === 'string') {
                console.log(`User Cooldown  Issue: ${context.from.username} | hehehe `)
                return await context.reply(`Please wait for ${this.cooldown(context)} before using the command again!`);
            };
            /**
             * @type {string}
             */
            let _contentt = context.message.text;
            if (!_contentt || !_contentt.length) {
                return await context.reply('Sorry, I did not understand your message! Please use the command /help to get started.');
            };
            _contentt = _contentt.toString();
            if (!_contentt.startsWith('.')) return await context.reply('Sorry, I did not understand your message! Please use the command /help to get started.');
            const [command, ...argss] = _contentt.slice(1).trim().split(/ +/g);
            if (command.toLowerCase() === 'kill') {
                const _mainQuery = argss.join(' ');
                if (!_mainQuery || !_mainQuery.length) return await context.reply(`Please provide card details in any of these formats: .kill ${accpetedFormats[1]}`);
                this.ratelimits.set(context.from.id, true);
                await context.reply('Processing your request... Please wait!').catch((_err) => {
                    this.client.oplogger.error(`Error in sending message to user: ${_err}`);
                    console.error(_err);
                });
                try {
                    let _okhehhe = executeOneOperationOk(_mainQuery).then(async (getArgs) => {
                        if (getArgs === undefined || getArgs === true) {
                            this.ratelimits.has(context.from.id) ? this.ratelimits.delete(context.from.id) : null;
                            return await context.reply(`Card has been killed successfully!`);
                        } else {
                            this.ratelimits.has(context.from.id) ? this.ratelimits.delete(context.from.id) : null;
                            return await context.reply(getArgs);
                        };
                    }).catch(async (err) => {
                        this.ratelimits.has(context.from.id) ? this.ratelimits.delete(context.from.id) : null;
                        this.client.oplogger.error(`Error in killing the card: ${err.message}`);
                        console.error(err);
                        return await context.reply(`Error in killing the card! Please try again later.`);
                    });
                    console.log(_okhehhe);
                } catch (_error) {
                    if (_error.toString().includes('executeOneOperationOk(...).then is not a function')) {
                        this.ratelimits.has(context.from.id) ? this.ratelimits.delete(context.from.id) : null;
                        return await context.reply('Invalid card details provided! Please provide card details in any of these formats: ' + accpetedFormats.join(',\n'));
                    };
                    this.client.oplogger.error(`Error in sending message to user try catch error block: ${_error.message}`);
                };
            };
        } else {
            return context.reply(`You are not authorised to use this bot! Please contact the admin to get access. ${adminNamesForTelegramBot.length > 0 ? `${adminNamesForTelegramBot.map(x_name => `@${x_name}`).join(", ")}` : ''}`);
        };
    }

    /**
     * @param {Context } message
     */
    ratelimit(message) {
        const _ratelimits = this.ratelimits.get(message.from.id) || false;
        return _ratelimits;
    };


    cooldown(message) {
        const cooldown = 40 * 1000;
        let ratelimits = this.cooldowns.get(message.from.id) || null;
        if (!ratelimits) ratelimits = Date.now() - cooldown;
        const difference = Date.now() - ratelimits;
        if (difference < cooldown) {
            let duration = cooldown - difference;
            return require("pretty-ms")((duration), {
                secondsDecimalDigits: 0
            });
        } else {
            ratelimits = Date.now();
            this.cooldowns.set(message.from.id, ratelimits);
            return true;
        }
    }
};

module.exports = { messageHandler };