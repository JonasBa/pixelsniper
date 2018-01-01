
const { runTests, uploadShot, getBranchName } = require('./screenshot_tests'),
      { spawn, exec, fork } = require('child_process'),
      path = require('path'),
      rimraf = require('rimraf'),
      chalk = require('chalk'),
      Spinner = require('cli-spinner').Spinner,
      Prompt = require('prompt-checkbox'),
      program = require('commander');

program
  .version('0.1.0')
  .option('-u, --update', 'Update snapshots')
  .option('-w, --workers <n>', 'Number of workers', parseInt)
  .parse(process.argv);

const processes = program.workers

const last = arr => arr[arr.length-1];

const config = {
  baseUrl: 'http://localhost:3000',
  master: 'master',
  pages: [
    {
      name: 'home',
      path: '/',
      timeout: 1000
    },
    {
      name: 'getting-started',
      path: '/getting-started/getting-started.html',
      timeout: 1000
    },{
      name: 'components',
      path: '/getting-started/using-components.html',
      timeout: 1000
    }, {
      name: 'examples',
      path: '/examples/bootstrap.html',
      timeout: 2000
    }, {
      name: 'search-store',
      path: '/getting-started/search-store.html',
      timeout: 1000
    }, {
      name: 'nuxt',
      path: '/advanced/integrate-with-nuxt.html',
      timeout: 1000
    }, {
      name: 'no-results',
      path: '/components/no-results.html',
      timeout: 1000
    }, {
      name: 'custom-components',
      path: 'getting-started/custom-components.html',
      timeout: 1000
    }
  ]
}

function main(){
  let allWorkers = 0;
  let stdOutString = "";

  process.stdout.write(chalk.green('Spawning screenshot service with', processes, 'builders'));

  if(processes > 1) {
    let k,j,temparray,chunk = processes;

    for (k = 0, j = config.pages.length; k < j; k += chunk) {
      const workerConfig = {
        ...config,
      }

      workerConfig.pages = config.pages.slice(k, k + chunk)

      const worker = fork('./src/screenshot.js', [], { silent:true });
      worker.send(workerConfig)

      worker.stdout.on('data', function(data) {
        stdOutString += data.toString();
        process.stdout.write(stdOutString)
      });

      worker.on('exit', code => {
        onAllWorkersDone()
      })
    }
  
  } else {
    const worker = fork('./src/screenshot.js');
    worker.send(config)

    process.stdout.write(chalk.green('Spawning ', processes, 'Chrome browsers'))

    worker.on('exit', code => {
      onAllWorkersDone()
    })
  }

  async function onAllWorkersDone(){
    allWorkers++;

    if(allWorkers === processes){
      const testResults = await runTests().then(data => data.filter(t => t.diff > 0))

      if(program.update && testResults.length > 0){
        const prompt = new Prompt({
          maxItems: 10,
          name: 'Update tests',
          message: 'The following tests have failed, would you like to update their snapshots?',
          choices: testResults.map(d => d.name)
        });

        prompt.run()
          .then(answers => {
            const repo = last(process.cwd().split('/')),
                  branch = config.master;

            const uploadPromises = answers.map(shot => {
              const screenshotPath = path.resolve(`./screenshots_temp/${shot}.png`)
              return uploadShot(screenshotPath, branch, repo);
            });

            Promise.all(uploadPromises).then(data => {
              rimraf.sync('./screenshots_temp')
              rimraf.sync('./_master_temp/*.png')
            })
        })
      } else {
        rimraf.sync('./screenshots_temp')
        rimraf.sync('./_master_temp/*.png')
      }

      return Promise.resolve(true)
    }
  }
}

main()



