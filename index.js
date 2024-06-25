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
const CNY = [138298337, 321196613, 196199961, 481607415, 603283];

// nazarkin
const THB = [53036421];
const KZT = [53036421];

            // luckjanov
const RSD = [70464800];

            // mfurzikov
const CHF = [321196613]

                  // vitaly
const CNYISLAST = [138298337];

bot.command('img', async ctx => {
    console.log(ctx.update.message.from, ctx.update.message.chat);

    const base = 'https://sbmaxx.github.io/yndx/';
    const args = [];

    args.push('r=' + Math.random());

    if (CNY.includes(ctx.update.message.from.id)) {
        args.push('cny=1');
    }

    if (ctx.update.message.from.is_premium) {
        args.push('premium=1');
    }

    if (CNYISLAST.includes(ctx.update.message.from.id)) {
        args.push('order=yndx,usd,eur,cny');
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

bot.command('premium', async ctx => {
    console.log(ctx.update.message.from, ctx.update.message.chat);

    const base = 'https://sbmaxx.github.io/yndx/premium.html';
    const args = [];

    args.push('r=' + Math.random());

    if (CNY.includes(ctx.update.message.from.id)) {
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

    fetch('https://rozhdestvenskiy.ru/yndx-stock-server')
        .then(r => r.json())
        .then(r => {
            return r.quoteResponse.result
                .filter((_, i) => i > 0)
                .map(o => ({
                    fallback: o.marketPrice,
                    price: o.regularMarketPrice,
                    change: o.regularMarketChange,
                    ticker: o.ticker
                }));
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

function processData(stocks, userId) {
    const addContent = ({ change, price, ticker, fallback }) => {
        const strPrice = (price || fallback).toFixed(2).replace('.', '\\.');
        const strChange = (
            (
                (change || 0) / ((price || fallback) + change)
            )
        * 100).toFixed(2) + '%';

        const postfix = (
            (change > 0 && strChange !== '0.00%' ? '+' : '') + strChange.replace('-', '−')
        );
        // .replace('.', '.')
        // .replace('+', '\\+');

        return `| ${ticker.padEnd(6, ' ')} | ${strPrice.trim().padStart(8, ' ')} | ${postfix.trim().padStart(6, ' ')} |`;
    }

    let content = "";

    content += `\`\`\`
+--------+---------+--------+
| Ticker | Price   | Change |
+--------+---------+--------+\n`;

    content += stocks.filter(({ ticker }, i) => {
        if (ticker === 'CNY' && CNY.includes(userId)) {
            return true;
        }

        if (ticker === 'THB' && THB.includes(userId)) {
            return true
        }

        if (ticker === 'KZT' && KZT.includes(userId)) {
            return true
        }

        if (ticker === 'RSD' && RSD.includes(userId)) {
            return true
        }

        if (ticker === 'CHF' && CHF.includes(userId)) {
            return true;
        }

        return ['YNDX', 'USD', 'EUR'].includes(ticker);
    }).map(({ change, price, fallback, ticker }) => addContent({
        change,
        price,
        fallback,
        ticker
    })).join('\n');

    content += `\n+--------+---------+--------+\`\`\``;

    return content;
}
