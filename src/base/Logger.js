const moment = require('moment');
class Logger {
    static log(content, type = 'log') {
        const timestamp = `\x1b[38;2;0;255;0m${moment().utcOffset('+05:30').format('DD.MM.yyyy / hh:mm:s A')}\x1b[0m\t`;
        switch (type) {
            case 'log': {
                return console.log(`${timestamp} [${type.toUpperCase()}]\t ${content} `);
            }
            case 'warn': {
                return console.log(`${timestamp} \x1b[38;2;255;80;0m[${type.toUpperCase()}]\x1b[0m\t ${content} `); // color: orange
            }
            case 'error': {
                return console.log(`${timestamp} \x1b[38;2;255;0;0m[${type.toUpperCase()}]\x1b[0m\t ${content} `); // color: red
            }
            case 'debug': {
                return console.log(`${timestamp} \x1b[38;2;255;80;105m[${type.toUpperCase()}]\x1b[0m\t ${content} `); // color: pink
            }
            case 'cmd': {
                return console.log(`${timestamp} \x1b[38;2;255;16;240m[${type.toUpperCase()}]\x1b[0m\t ${content}`); // color: blue
            }
            case 'ready': {
                return console.log(`${timestamp} \x1b[38;2;185;99;255m[${type.toUpperCase()}]\x1b[0m\t ${content}`); // color: purple
            }
            default: throw new TypeError('Logger type must be either warn, debug, log, ready, cmd or error.');
        }
    }
    static error(content) {
        return this.log(content, 'error');
    }

    static warn(content) {
        return this.log(content, 'warn');
    }

    static debug(content) {
        return this.log(content, 'debug');
    }

    static cmd(content) {
        return this.log(content, 'cmd');
    }
}
module.exports = Logger;