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

const users = require('./users');

// TODO: move to separate file
const clubs = {
    'ydex': true,
    'nbis': [users.vadimP, users.mfurzikov, users.sbmaxx, users.xxxxxx, users.igorS, users.vitaly, users.ternos],
    'moex': [users.vadimP, users.mfurzikov, users.sbmaxx, users.xxxxxx, users.igorS, users.vitaly],
    'usd': true,
    'eur': [users.vadimP, users.sbmaxx, users.xxxxxx, users.igorS, users.vitaly, users.ternos],
    'cny': [users.vitaly, users.mfurzikov, users.igorS, users.nikitaP],
    'thb': [users.nazarkin],
    'kzt': [users.nazarkin],
    'rsd': [users.luckjanov],
    'chf': [users.mfurzikov],
}

bot.command('img', async ctx => {
    console.log(ctx.update.message.from, ctx.update.message.chat);

    const url = getAPIUrl(ctx.update.message.from.id, ctx.update.message.from.is_premium);

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

        ctx.replyWithPhoto({
            source: './example.png'
        });

	    await page.close();
    } catch (e) {
        console.error(e);
        return ctx.replyWithMarkdown('Бот в *отпуске*\n' + e);
    }
});

bot.command('wazzup', ctx => {
    console.log(ctx.update.message.from, ctx.update.message.chat);

    fetch('https://rozhdestvenskiy.ru/yndx-stock-server')
        .then(r => r.json())
        .then(r => {
            return r.quoteResponse.result
                .filter((_, i) => i > 0)
                .map(o => {
                    if (typeof o === 'string') {
                        return o;
                    }

                    return {
                        inverse: o.inverse,
                        fallback: o.marketPrice,
                        price: o.regularMarketPrice,
                        change: o.regularMarketChange,
                        changePercent: o.regularMarketChangePercent,
                        ticker: o.ticker
                    }
                });
        })
        .then(data => ctx.replyWithMarkdownV2(processData(data, ctx.update.message.from.id)));
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

function getOrderForUserId(userId) {
    if (userId === users.vitaly) {
        return ['ydex', 'nbis', 'moex', 'eur', 'usd', 'cny'];
    }

    return Object.keys(clubs).reduce((acc, key) => {
        let acl = clubs[key];
        if (acl === true || acl.includes(userId)) {
            acc.push(key);
        }
        return acc;
    }, []);
}

function getAPIUrl(userId, isPremium) {
    const base = 'https://sbmaxx.github.io/yndx/';
    const args = [];

    args.push('r=' + Math.random());

    if (isPremium) {
        args.push('premium=1');
    }

    if (userId === users.xxxxxx) {
        args.push('percents=1');
    }

    args.push('order=' + getOrderForUserId(userId).join(','));

    return base + (args.length ? '?' + args.join('&') : '');
}

function processData(stocks, userId) {
    const obj = stocks.reduce((acc, curr) => {
        // in case we have an error
        if (typeof curr === 'string') {
            return acc;
        }

        acc[curr.ticker.toLowerCase()] = curr;
        return acc;
    }, {});

    const addContent = ({ change, changePercent, price, ticker, fallback }) => {
        if (price === null && fallback === null) {
            return '';
        }

        const strPrice = (price || fallback).toFixed(2).replace('.', '\\.');
        const strChange = (changePercent || fallback).toFixed(2) + '%';

        const postfix = (
            (change > 0 && strChange !== '0.00%' ? '+' : '') + strChange.replace('-', '−')
        );
        // .replace('.', '.')
        // .replace('+', '\\+');

        return `| ${ticker.toUpperCase().padEnd(6, ' ')} | ${strPrice.trim().padStart(8, ' ')} | ${postfix.trim().padStart(6, ' ')} |`;
    }

    let content = "";

    content += `\`\`\`
+--------+---------+--------+
| Ticker | Price   | Change |
+--------+---------+--------+\n`;

    let order = getOrderForUserId(userId);

    content += order.map(ticker => addContent(obj[ticker])).join('\n');

    content += `\n+--------+---------+--------+\`\`\``;

    return content;
}
