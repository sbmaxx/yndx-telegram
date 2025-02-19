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

             // vitaly, mfurzikov, igor, nikita pogorelov
const CNY = [138298337, 321196613, 196199961, 481607415];

// nazarkin
const THB = [53036421];
const KZT = [53036421];

            // luckjanov
const RSD = [70464800];

            // mfurzikov
const CHF = [321196613]

                  // vitaly
const CNYISLAST = [138298337];

                // mfurzikov, sbmaxx, alsuprun, likipiki, antonina
const BMWCLUB = [321196613, 603283, 223013551, 216399855, 889653278]

                    // vadim petrov, sbmaxx, xxxxxxx, vitaly igor spicivcev
const IMOEXCLUB = [203630573, 603283, 268365567, 138298337, 196199961];

bot.command('img', async ctx => {
    console.log(ctx.update.message.from, ctx.update.message.chat);

    const base = 'https://sbmaxx.github.io/yndx/';
    const args = [];

    args.push('r=' + Math.random());

    if (CNY.includes(ctx.update.message.from.id)) {
        args.push('cny=1');
    }

    if (BMWCLUB.includes(ctx.update.message.from.id)) {
        args.push('bmw=1');
    }

    if (THB.includes(ctx.update.message.from.id)) {
        args.push('thb=1');
    }

    if (KZT.includes(ctx.update.message.from.id)) {
        args.push('kzt=1');
    }

    if (CHF.includes(ctx.update.message.from.id)) {
        args.push('chf=1');
    }

    if (RSD.includes(ctx.update.message.from.id)) {
        args.push('rsd=1');
    }

    if (IMOEXCLUB.includes(ctx.update.message.from.id)) {
        args.push('moex=1');
    }

    if (ctx.update.message.from.is_premium) {
        args.push('premium=1');
    }

    if (CNYISLAST.includes(ctx.update.message.from.id)) {
        args.push('order=ydex,nbis,moex,eur,usd,cny');
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

function processData(stocks, userId) {
    const addContent = ({ change, price, ticker, fallback }) => {
        if (price === null && fallback === null) {
            return '';
        }

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

        return `| ${ticker.toUpperCase().padEnd(6, ' ')} | ${strPrice.trim().padStart(8, ' ')} | ${postfix.trim().padStart(6, ' ')} |`;
    }

    let content = "";

    content += `\`\`\`
+--------+---------+--------+
| Ticker | Price   | Change |
+--------+---------+--------+\n`;

    let order = CNYISLAST.includes(userId) ?
        ['ydex', 'nbis', 'moex', 'usd', 'eur', 'cny', 'thb', 'kzt', 'rsd', 'chf'] :
        ['ydex', 'nbis', 'moex', 'eur', 'usd', 'cny', 'thb', 'kzt', 'rsd', 'chf'];

    const obj = stocks.reduce((acc, curr) => {
        // in case we have an error
        if (typeof curr === 'string') {
            return acc;
        }

        acc[curr.ticker.toLowerCase()] = curr;
        return acc;
    }, {});

    content += order.filter(ticker => !!obj[ticker]).filter(ticker => {
        if (ticker === 'bmw' && BMWCLUB.includes(userId)) {
            return true;
        }

        if (ticker === 'cny' && CNY.includes(userId)) {
            return true;
        }

        if (ticker === 'thb' && THB.includes(userId)) {
            return true
        }

        if (ticker === 'kzt' && KZT.includes(userId)) {
            return true
        }

        if (ticker === 'rsd' && RSD.includes(userId)) {
            return true
        }

        if (ticker === 'chf' && CHF.includes(userId)) {
            return true;
        }

        if (ticker === 'moex' && IMOEXCLUB.includes(userId)) {
            return true;
        }

        return ['ydex', 'usd', 'eur'].includes(ticker);
    }).map(ticker => addContent(obj[ticker])).join('\n');

    content += `\n+--------+---------+--------+\`\`\``;

    return content;
}
