const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const crypto = require('crypto');

require('dotenv').config();

const { Telegraf } = require('telegraf');

const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('Get token via @botfather');
    console.error('https://core.telegram.org/bots#how-do-i-create-a-bot');
    console.error('echo BOT_TOKEN="token" >> .env')
    process.exit(1);
}

const bot = new Telegraf(token);

let browser;

(async () => {
    browser = await puppeteer.launch();
})();

// vitaly, mfurzikov, igor, nikita pogorelov, sbmaxx
const CNYACL = [138298337, 321196613, 196199961, 481607415, 603283];

bot.command('img', async ctx => {
    console.log(ctx.update.message.from, ctx.update.message.chat);

    const base = 'https://sbmaxx.github.io/yndx/';
    const args = [];

    if (CNYACL.includes(ctx.update.message.from.id)) {
        args.push('cny=1');
    }

    if (ctx.update.message.from.is_premium) {
        args.push('premium=1');
    }

    const url = base + (args.length ? '?' + args.join('&') : '');

    try {
        const page = await browser.newPage();

        await page.setViewport({
            width: 800,
            height: 600,
            deviceScaleFactor: 1,
        });

        await page.goto(url);

        await page.waitForSelector('body.loaded');

        await page.waitForTimeout(1500);

        await page.screenshot({ path: 'example.png' });

        return ctx.replyWithPhoto({
            source: './example.png'
        });
    } catch (e) {
    	console.error(e);
        return ctx.replyWithMarkdown('Бот в *отпуске*\n' + e);
    }
});

bot.command('wazzup', ctx => {
    console.log(ctx.update.message.from, ctx.update.message.chat);

    fetch('https://rozhdestvenskiy.ru/yndx-stock-server').then(r => r.json()).then(data => {
        return ctx.replyWithMarkdownV2(processData(data, ctx.update.message.from.id));
    });
});

if (process.env.NODE_ENV === 'production') {
    const domain = process.env.WEBHOOK_DOMAIN;;
    const port = Number(process.env.PORT) || 3000;
    bot.launch({
        webhook: {
            domain,
            port,
            host: 'localhost',
            hookPath: '/yndx-stocks',
            secretToken: crypto.randomBytes(64).toString('hex'),
        },
    }).then(() => console.log('launched')).catch(e => console.error(e));
} else {
    bot.launch().then(() => console.log('launched')).catch(e => console.error(e));
}

process.on('SIGINT', async () => {
    console.log('on sigint');
    bot.stop('SIGINT');
    await browser.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('on sigterm');
    bot.stop('SIGTERM');
    await browser.close();
    process.exit(0);
});

function processData(data, userId) {
    const addContent = ({ change, price, ticker }) => {
        const strChange = change.toFixed(2);
        const postfix = (change > 0 && strChange !== '0.00' ? '+' : '') + strChange.replace('-', '−');

        return `*${ticker}* \n||${price.replace('.', '\\.')}, ${postfix.replace('.', '\\.').replace('+', '\\+')}||\n`;
    }

    const moex = data.quoteResponse.result[1];
    const forexUSD = data.quoteResponse.result[2];
    const forexEUR = data.quoteResponse.result[3];
    const forexCNY = data.quoteResponse.result[4];

    const moexPrice = moex.regularMarketPrice.toFixed(2);
    const moexChange = moex.regularMarketChange;

    const forexUSDPrice = forexUSD.regularMarketPrice.toFixed(2);
    const forexUSDChange = forexUSD.regularMarketChange;

    const forexEURPrice = forexEUR.regularMarketPrice.toFixed(2);
    const forexEURChange = forexEUR.regularMarketChange;

    const forexCNYPrice = forexCNY.regularMarketPrice.toFixed(2);
    const forexCNYChange = forexCNY.regularMarketChange;

    let response = '';

    response += addContent({ ticker: 'YNDX', change: moexChange, price: moexPrice });
    response += addContent({ ticker: 'USD', change: forexUSDChange, price: forexUSDPrice });
    response += addContent({ ticker: 'EUR', change: forexEURChange, price: forexEURPrice });

    if (CNYACL.includes(userId)) {
        response += addContent({ ticker: 'CNY', change: forexCNYChange, price: forexCNYPrice });
    }

    return response;
}
