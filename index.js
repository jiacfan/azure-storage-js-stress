const fs = require("fs");
const path = require("path");
const commandLineArgs = require("command-line-args");
const { execute } = require("./executor");
const { optionDefinitions } = require("./const");

async function main() {
  const options = commandLineArgs(optionDefinitions);

  const accountName = options.AccountName || process.env["AccountName"];
  const accountKey = options.AccountKey || process.env["AccountKey"];
  if (!accountName || !accountKey) {
    throw Error(
      "AccountName and AccountKey must be provided in argument list or environment variables."
    );
  }

  const loggerStream = fs.createWriteStream(
    path.join(options.Log, `jsv10queuestress_${new Date().getTime()}`),
    {
      autoClose: true
    }
  );

  let isEnd = false;
  const log = content => {
    if (content && !isEnd) {
      loggerStream.write(`${new Date().toISOString()} ${content}`);
    }
  };

  log(JSON.stringify(options) + "\n");

  const rounds = options.Rounds;

  let enqueueMethod = options.Legacy
    ? require("./enqueue.v2").enqueue
    : require("./enqueue.v10").enqueue;

  const dequeueMethod = options.Legacy
    ? require("./dequeue.v2").dequeue
    : require("./dequeue.v10").dequeue;

  let succeededRound = 0;
  let failedRound = 0;

  let totalCPU = 0;
  let totalMemory = 0;
  let totalTime = 0;
  for (let i = rounds; i > 0; i--) {
    log(`>>>>>> Rounds ${i} starting...\n`);

    const roundStartTime = new Date();
    const response = await execute(
      accountName,
      accountKey,
      enqueueMethod,
      dequeueMethod,
      log,
      options
    );
    const roundEndTime = new Date();

    response.errors.forEach(error => {
      log(JSON.stringify(error) + "\n");
    });
    response.retries.forEach(retry => {
      log(JSON.stringify(retry) + "\n");
    });

    let counter = 0;
    let cpu = 0;
    let memory = 0;
    response.stats.forEach(stat => {
      counter++;
      cpu += stat.cpu;
      memory += stat.memory;
      //   log(JSON.stringify(stat) + "\n");
    });
    let avgCPU = 0;
    let avgMemory = 0;
    if (counter > 0) {
      avgCPU = (cpu / counter / 100).toFixed(2);
      avgMemory = (memory / counter / 1024 / 1024).toFixed(2);
      log(`###### CPU: ${avgCPU} ##### Memory: ${avgMemory} \n`);
    }

    if (response.errors.length !== 0) {
      failedRound++;
    } else {
      succeededRound++;
    }

    const roundTime = (roundEndTime - roundStartTime) / 1000;

    totalCPU += parseFloat(avgCPU);
    totalMemory += parseFloat(avgMemory);
    totalTime += roundTime;
    log(
      `>>>>>> Rounds ${i} finished. AvgMemory: ${avgMemory}. AvgCPU: ${avgCPU}. Time: ${roundTime}\n`
    );
  }

  log(
    `succeeded round: ${succeededRound}, failed round: ${failedRound}.\nAvgCPU: ${(
      totalCPU / rounds
    ).toFixed(2)}. AvgMemory: ${(totalMemory / rounds).toFixed(2)}. AvgTime: ${(
      totalTime / rounds
    ).toFixed(2)}`
  );
  loggerStream.end();
  isEnd = true;

  console.log(
    `succeeded round: ${succeededRound}, failed round: ${failedRound}`
  );
}

const startTime = new Date();

main()
  .then(() => {
    console.log(
      JSON.stringify({
        "scenario start": startTime.toISOString(),
        "scenario end": new Date().toISOString()
      })
    );
  })
  .catch(error => {
    console.log(
      JSON.stringify({
        "scenario start": startTime.toISOString(),
        "scenario end": new Date().toISOString(),
        errors: [
          {
            type: error.name,
            message: `Message: ${error.message} Stack: ${error.stack}`,
            time: new Date().toISOString()
          }
        ]
      })
    );
  });
