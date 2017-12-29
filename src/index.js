
const runTests = require('./screenshot_tests'),
      { spawn, exec, fork } = require('child_process'),
      rimraf = require('rimraf');

const processes = parseInt(process.env.builders) || 1;

const config = {
  baseUrl: 'http://localhost:3000',
  master: 'master',
  pages: [
    {
      name: 'home',
      path: '/',
    },
    {
      name: 'getting-started',
      path: '/getting-started/getting-started.html',
    },{
      name: 'components',
      path: '/getting-started/using-components.html'
    }
  ]
}


async function main(){
  let allWorkers = 0;

  if(processes > 1) {
    let k,j,temparray,chunk = processes;

    for (k = 0, j = config.pages.length; k < j; k += chunk) {
      const workerConfig = {
        ...config,
      }

      workerConfig.pages = config.pages.slice(k, k + chunk)

      const worker = fork('./src/screenshot.js');
      worker.send(workerConfig)

      worker.on('exit', code => {
        onAllWorkersDone()
      })
    }

  } else {
    const worker = fork('./src/screenshot.js');
    worker.send(config)

    worker.on('exit', code => {
      onAllWorkersDone()
    })
  }

  async function onAllWorkersDone(){
    allWorkers++;

    if(allWorkers === processes){
      await runTests();

      // rimraf.sync('./screenshots_temp')
      // rimraf.sync('./_master_temp/*.png')
    }
  }
}