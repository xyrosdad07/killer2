/**
 * @class Utils
 */
const accpetedFormats = [
    "1234 5678 1234 5678 | 02 | 2023 | 123",
    "1234567812345678 | 2 | 23 | 123",
    "XXXX XXXX XXXX XXXX | MM | YY | XXX",
    "1234567812345678 | MM/YY | 123"
];

class Utils {
    constructor() {
    };

    /**
     *  Extract card details from a string of card details in any format and return an object of the card details if valid or return an error message if invalid card details format is provided.
     * @param {string} wholeCardArgs
     */
    extractCardDetails(wholeCardArgs) {
        if (!wholeCardArgs) {
            return 'Please provide card details in any of these formats: ' + accpetedFormats.join(',\n');
        };
        if (typeof wholeCardArgs !== 'string') {
            return 'Invalid card details provided! Please provide card details in any of these formats: ' + accpetedFormats.join(',\n');
        };
        try {
            let _validCardDetails = [];
            // first remove all the spaces from the string
            wholeCardArgs = wholeCardArgs.split(' ').join('');
            for (let _x_info of wholeCardArgs.split('|')) {
                _x_info = _x_info.split(' ').join('').replace(/ /g, '');
                if (_x_info.length === 16 || _x_info.length === 19) {
                    let x_nomInfo = _x_info.split('-').join('').replace(/ /g, '');
                    if (x_nomInfo.length === 16) {
                        _validCardDetails.push(x_nomInfo);
                        continue;
                    } else {
                        return `Invalid card format! Please use any of these formats: ${accpetedFormats.join(',\n')}`;
                    };
                };
                _validCardDetails.push(_x_info);
            };
            if (_validCardDetails.length === 3 || _validCardDetails.length === 4) {
                let cardNumber = null;
                let expireMonth = null;
                let expireYear = null;
                let cvv = null;
                if (_validCardDetails.length === 3) {
                    for (let _any_of_detail of _validCardDetails) {
                        if (_any_of_detail.length === 16) {
                            cardNumber = _any_of_detail.replace(/ /g, '');
                            continue;
                        } else if (_any_of_detail.length === 3) {
                            cvv = _any_of_detail;
                            continue;

                        } else if (_any_of_detail.split('/').length === 2) {
                            expireMonth = _any_of_detail.split('/')[0];
                            if (expireMonth.length === 1) {
                                expireMonth = '0' + expireMonth;
                            };
                            expireYear = _any_of_detail.split('/')[1];
                            if (expireYear.length === 4) {
                                expireYear = expireYear.slice(2);
                            };
                            continue;
                        };
                    };
                } else if (_validCardDetails.length === 4) {

                    for (let _any_of_detail of _validCardDetails) {
                        if (_any_of_detail.length === 16) {
                            cardNumber = _any_of_detail.replace(/ /g, '');
                            continue;
                        } else if (_any_of_detail.length === 3) {
                            cvv = _any_of_detail;
                            continue;
                        } else if (_any_of_detail.length === 4) {
                            expireYear = _any_of_detail.slice(2);
                            continue;
                        } else if (_any_of_detail.length === 1) {
                            expireMonth = '0' + _any_of_detail;
                            continue;
                        } else if (_any_of_detail.length === 2) {
                            let _month_or_year = parseInt(_any_of_detail);
                            if (Math.abs(_month_or_year) <= 12) {
                                expireMonth = Math.abs(_month_or_year);
                                continue;
                            } else {
                                expireYear = _any_of_detail;
                                continue;
                            };
                        };
                    };
                };
                if (!cardNumber || !expireMonth || !expireYear || !cvv) {
                    return `Invalid card format! Please use any of these formats: ${accpetedFormats.join(',\n')}`;
                };
                cardNumber = parseInt(cardNumber);
                expireMonth = Math.abs(parseInt(expireMonth));
                expireYear = Math.abs(parseInt(expireYear));
                cvv = Math.abs(parseInt(cvv));
                if (isNaN(cardNumber) || isNaN(expireMonth) || isNaN(expireYear) || isNaN(cvv)) {
                    return `Invalid card format! Please use any of these formats: ${accpetedFormats.join(',\n')}`;
                };
                if (expireMonth < 1 || expireMonth > 12) {
                    return `Invalid card format! Please use any of these formats: ${accpetedFormats.join(',\n')}`;
                };
                if ((expireYear < parseInt((new Date().getFullYear().toString().slice(2)))) || (expireYear > 43)) {
                    return `Invalid card format! Please use any of these formats: ${accpetedFormats.join(',\n')}`;
                };
                return { cardNumber, expireMonth, expireYear, cvv };
            } else {
                return `Invalid card format! Please use any of these formats: ${accpetedFormats.join(',\n')}`;
            };
        } catch (error) {
            console.error(error);
            return `Invalid card format! Please use any of these formats: ${accpetedFormats.join(',\n')}`;
        };
    };

    /**
     * 
     * @param {boolean} noArgsok  If true then just return string of random name. If false then return object of random name.
     * @returns 
     */
    getRandomName(noArgsok = false) {
        if (noArgsok) {
            const nameLength = Math.floor(Math.random() * 7) + 3;
            const characters = 'abcdefghijklmnopqrstuvwxyz';
            const _nameok = Array.from({ length: nameLength }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
            return _nameok;
        };
        const nameLength = Math.floor(Math.random() * 7) + 3; // Random length between 3 and 10
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        let firstName = Array.from({ length: nameLength }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
        let lastName = Array.from({ length: nameLength }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
        if (firstName === lastName) {
            lastName = this.getRandomName(true);
        };
        firstName = firstName[0].toUpperCase() + firstName.slice(1);
        lastName = lastName[0].toUpperCase() + lastName.slice(1);
        let nickName = firstName + lastName;
        return {
            firstName: firstName,
            lastName: lastName,
            nickName: nickName
        };
    }

    /**
     * Generates a random cvv number between 100 to 999.
     * @param {number} excludedNumbers If the generated number is same as excludedNumbers then regenerate the number. 
     * @returns 
     */
    generateUnqiueCvv(excludedNumbers) {
        let randomNumber;
        do {
            randomNumber = Math.floor(Math.random() * 900) + 100;
        } while (randomNumber === excludedNumbers);
        return randomNumber;
    };
};

module.exports = {Utils , accpetedFormats};