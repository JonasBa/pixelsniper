
const puppeteer = require('puppeteer'),
      fs = require('fs'),
      rimraf = require('rimraf');

const prepareRemoveStyles = (stringArray = []) => {
  return stringArray.map(a => `${a} { display: none !important }`).join('\n')
}

const prepareStyles = (stringArray = []) => {
  return stringArray.map(a => `${a} { opacity: 0 !important }`).join('\n')
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function makeShot(config, page, browserPage) {
  const id = page.path;
  const name = page.name;
  const threshold = page.threshold || 0.01;
  const timeout = page.timeout || 0;

  const removeStyles = page.removeElements ? prepareRemoveStyles(page.removeElements) : null;
  const hideElements = page.hideElements ? prepareStyles(page.hideElements) : null;

  await browserPage.goto(config.baseUrl + id);
  await wait(timeout)
  
  await browserPage.addStyleTag({
    content: (hideElements || '') + (removeStyles || '')
  })

  await browserPage.screenshot({
    path: `./screenshots_temp/${name}.png`,
    fullPage: true
  });
}

async function makeScreenshots(config, page){
  for (const pageItem of config.pages){
    await makeShot(config, pageItem, page)
  };
}

if(!fs.existsSync('./screenshots_temp')){
  fs.mkdirSync('./screenshots_temp');
}

async function runPuppeteer(config) {
  let browser = puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  browser = await browser;

  const browserPage = await browser.newPage();
  await browserPage.setViewport({width: 1024, height: 768});

  await makeScreenshots(config, browserPage);
  
  return Promise.resolve(true)
}

process.on('message', data => {
  const message = JSON.stringify(data)

  runPuppeteer(data).then(success => {
    success ? process.exit(0) : process.exit(1)
  })
})
