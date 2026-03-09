const puppeteer = require('puppeteer');
const fs = require('fs');

// TODO: Load the credentials from the 'credentials.json' file
// HINT: Use the 'fs' module to read and parse the file
const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

(async () => {
    // TODO: Launch a browser instance and open a new page
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    page.setDefaultTimeout(30000);

    // Navigate to GitHub login page
    await page.goto('https://github.com/login', { waitUntil: 'networkidle2' });

    // TODO: Login to GitHub using the provided credentials
    // HINT: Use the 'type' method to input username and password, then click on the submit button
    await page.type('#login_field', credentials.username);
    await page.type('#password', credentials.password);
    await Promise.all([
        page.click('input[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Wait for successful login
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (page.url().includes('/login') || page.url().includes('/session')) {
        console.log('Login failed or GitHub asked for extra verification.');
        await page.screenshot({ path: 'login-debug.png', fullPage: true });
        await browser.close();
        return;
    }

    // Extract the actual GitHub username to be used later
    const actualUsername = credentials.username;

    const repositories = ["cheeriojs/cheerio", "axios/axios", "puppeteer/puppeteer"];

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`, { waitUntil: 'networkidle2' });

        // TODO: Star the repository
        // HINT: Use selectors to identify and click on the star button
        const starButton = await page.$('form[action*="/star"] button');

        if (starButton) {
            await starButton.click();
            console.log(`Starred ${repo}`);
        } else {
            console.log(`${repo} already starred`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500)); // This timeout helps ensure that the action is fully processed
    }

    // TODO: Navigate to the user's starred repositories page
    await page.goto(`https://github.com/${actualUsername}?tab=stars`, { waitUntil: 'networkidle2' });

    // TODO: Click on the "Create list" button
    await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a'));
        const createListButton = elements.find(el =>
            el.textContent.includes('Create list') &&
            el.offsetParent !== null
        );

        if (!createListButton) {
            throw new Error('Create list button not found');
        }

        createListButton.click();
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // TODO: Create a list named "Node Libraries"
    // HINT: Wait for the input field and type the list name
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'Node Libraries');

    // Wait for buttons to become visible
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Identify and click the "Create" button
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createButton = buttons.find(button =>
            button.textContent.trim() === 'Create' &&
            button.offsetParent !== null
        );

        if (!createButton) {
            throw new Error('Visible Create button not found');
        }

        createButton.click();
    });

    // Allow some time for the list creation process
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`, { waitUntil: 'networkidle2' });

        const dropdownSelector = 'summary[aria-label*="list"], summary[aria-label*="Lists"], button[aria-label*="list"], button[aria-label*="Lists"]';

        // TODO: Add this repository to the "Node Libraries" list
        // HINT: Open the dropdown, wait for it to load, and find the list by its name
        await page.waitForSelector(dropdownSelector);
        await page.click(dropdownSelector);
        await new Promise(resolve => setTimeout(resolve, 1500));
        await page.waitForSelector('.js-user-list-menu-form');

        await page.evaluate(() => {
            const lists = Array.from(document.querySelectorAll('.js-user-list-menu-form'));

            const target = lists.find(list =>
                list.innerText.includes('Node Libraries')
            );

            if (!target) {
                throw new Error('Node Libraries list not found');
            }

            const clickable =
                target.querySelector('label') ||
                target.querySelector('button') ||
                target.querySelector('input') ||
                target;

            clickable.click();
        });

        // Allow some time for the action to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Close the dropdown to finalize the addition to the list
        await page.click(dropdownSelector);
    }

    // Close the browser
    await browser.close();
})();