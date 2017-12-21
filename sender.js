
const fs = require('fs'),
      glob = require('glob'),
      request = require('request'),
      pixelmatch = require('pixelmatch'),
      PNG = require('pngjs').PNG,
      {exec} = require('child_process');

const screenshots = glob.sync('*.png'),
      screenshotDir = './';

function getBranchName() {
  return new Promise((resolve) => {
    exec('git rev-parse --abbrev-ref HEAD', (err, stdout) => {
      !err ? resolve(stdout) : false;
    });
  });
}


async function getScreenShot(fileName, branchName) {
  const name = fileName.replace(/\.png$/, '')
  const stream = fs.createWriteStream(`./temp/${name}_temp.png`);
  
  return new Promise((resolve, reject) => {
    request(`http://localhost:3001/screenshot?branch=${branchName}&screenshot=${name}`).pipe(stream)

    stream.on('finish', () => {
      resolve(true);
    })

    stream.on('error', (err) => {
      resolve(404)
    });
  })
}

function checkRegression(fileName, branchName) {
  return new Promise((resolve,reject) => {
    const name = fileName.replace(/\.png$/, '')

    const originalScreenshot = fs.createReadStream(`./${fileName}`).pipe(new PNG()).on('parsed', doneReading),
          newScreenshot = fs.createReadStream(`./temp/${name}_temp.png`).pipe(new PNG()).on('parsed', doneReading);

    let filesRead = 0;

    function doneReading() {
      if (++filesRead < 2) return;
      const diff = new PNG({width: originalScreenshot.width, height: newScreenshot.height}),
            stream = fs.createWriteStream(`./temp/${name}_diff.png`);

      const diffPixels = pixelmatch(originalScreenshot.data, newScreenshot.data, diff.data, originalScreenshot.width, originalScreenshot.height, {threshold: 0.01});
      diff.pack().pipe(stream);

      stream.on('finish', () => {
        resolve(diffPixels);
      })
    }
  });
}

if(!fs.existsSync('./temp')){
  fs.mkdirSync('./temp');
}

async function lifeCycle() {
  const branchName = await getBranchName();
  const promises = screenshots.map(s => getScreenShot(s, branchName))
  console.log(bran)
  
  Promise.all(promises).then((data) => {
    screenshots.map((s) => checkRegression(s, branchName))
  });
}

lifeCycle();
