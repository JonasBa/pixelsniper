
const fs = require('fs'),
      glob = require('glob'),
      path = require('path'),
      request = require('request'),
      pixelmatch = require('pixelmatch'),
      PNG = require('pngjs').PNG,
      { exec } = require('child_process');

const last = arr => arr[arr.length-1];

function getBranchName() {
  return new Promise((resolve) => {
    exec('git rev-parse --abbrev-ref HEAD', (err, stdout) => {
      !err ? resolve(stdout.replace(/\n/, '')) : false;
    });
  });
}

function getScreenShot(repositoryName, branchName, fileName) {
  const name = last(fileName.replace(/\.png$/, '').split('/'))
  const stream = fs.createWriteStream(`./_${branchName}_temp/${name}_temp.png`);
  
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3001/screenshot?repo=${repositoryName}&branch=${branchName}&screenshot=${name}`;

    request(url)
      .pipe(stream)
    
    stream.on('finish', () => {
      resolve(true);
    })
    
    stream.on('error', (err) => {
      resolve(404)
    });
  })
}

function checkRegression(repo, branchName, fileName) {
  return new Promise((resolve,reject) => {
    const name = last(fileName.replace(/\.png$/, '').split('/'))

    const originalScreenshot = fs.createReadStream(`./_master_temp/${name}_temp.png`).pipe(new PNG()).on('parsed', doneReading),
    newScreenshot = fs.createReadStream(`./screenshots_temp/${name}.png`).pipe(new PNG()).on('parsed', doneReading);
    
    let filesRead = 0;
    
    function doneReading() {
      if (++filesRead < 2) return;
      const diff = new PNG({width: originalScreenshot.width, height: newScreenshot.height}),
      stream = fs.createWriteStream(`./_master_temp/diffs/${name}_diff.png`);
      
      const diffPixels = pixelmatch(originalScreenshot.data, newScreenshot.data, diff.data, originalScreenshot.width, originalScreenshot.height, {threshold: 0.01});
      diff.pack().pipe(stream);
      
      stream.on('finish', () => {
        resolve(diffPixels);
      })
    }
  });
}

async function runTests() {
  const branchName = await getBranchName(),
        branchPath = path.resolve(`./_${branchName}_temp`),
        diffsPath = branchPath + '/diffs',
        screenshots = glob.sync('./screenshots_temp/*.png'),
        repo = last(process.cwd().split('/'));
  
  if(!fs.existsSync(branchPath)){
    fs.mkdirSync(branchPath);
  }

  if(!fs.existsSync(diffsPath)){
    fs.mkdirSync(diffsPath);
  }

  return new Promise((resolve, rejext) => {
  const promises = screenshots.map(s => getScreenShot(repo, 'master', s))

    Promise.all(promises).then((data) => {
      const regressionPromises = screenshots.map((s) => checkRegression(repo, branchName, s));

      Promise.all(regressionPromises).then(data => {
        resolve();
      })
    });
  })
}

module.exports = runTests;
