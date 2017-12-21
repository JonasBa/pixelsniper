
const fs = require('fs'),
      express = require('express'),
      path = require('path'),
      bodyParser = require('body-parser');

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

const app = express();
app.use(bodyParser());




async function checkBranchExists(branchName) {
  return new Promise((resolve, reject) => {
    const branchPath = path.resolve(`./${branchName}`)
    fs.exists(branchPath, exists => {
      if(!exists) {
        fs.mkdir(path.resolve(`./${branchName}`), err => {
          if(!err){
            resolve();
          }
        })
      } else {
        resolve()
      }
    });
  })
}

async function checkScreenShotExists(branchName, screenshot) {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(`./${branchName}/${screenshot}.png`)

    fs.exists(filePath, exists => {
      if(!exists){
        resolve(404)
      } else {
        resolve(filePath);
      }
    });
  });
}

app.get('/screenshot', asyncMiddleware(async(req, resp) => {
  const {branch, screenshot} = req.query;
  const results = await checkBranchExists(branch);
  const fileExists = await checkScreenShotExists(branch, screenshot);
  console.log(fileExists)
  if(fileExists === 404) {
    resp.send(404)
  } else {
    resp.download(path.resolve(`./${branch}/${screenshot}.png`))
  }
}));

app.listen('3001', () => {
  console.log('server listening on localhost:3000')
});