const {
  ServiceURL,
  StorageURL,
  SharedKeyCredential,
  QueueURL,
  Aborter
} = require("..");
var crypto = require("crypto");
var pidusage = require("pidusage");

async function execute(account, key, enqueue, dequeue, log, options) {
  let enqueuingWorkerCount = 0;
  let dequeuingWorkerCount = 0;
  let enqueueSucceededCount = 0;
  let enqueueFailedCount = 0;
  let dequeueSucceededCount = 0;
  let dequeueFailedCount = 0;
  let dequeueSucceededMessagesCount = 0;
  let dequeueFailedMessagesCount = 0;
  let messagesInCloudCount = 0;

  let pendingEnqueueMessageCount = options.NumberOfMessages;

  const enqueueConcurrency = options.EnqueueConcurrency;
  const dequeueConcurrency = options.DequeueConcurrency;
  const messageSizeInBytes = options.MessageSizeInBytes;

  const maxNumberOfMessagesPerReadOp = options.MaxNumberOfMessagesPerReadOp;

  let buffer = crypto.randomBytes(messageSizeInBytes);
  let messageContent = buffer.toString("base64").substr(0, messageSizeInBytes); // by default encoded in utf8

  // xml encoding
  messageContent = messageContent
    .replace(/&/gm, "&amp;")
    .replace(/</gm, "&lt;")
    .replace(/>/gm, "&gt;")
    .replace(/"/gm, "&quot;")
    .replace(/'/gm, "&apos;")
    .replace(/\0/gm, " ");

  const serviceURL = new ServiceURL(
    `https://${account}.queue.${options.EndpointSuffix}`,
    StorageURL.newPipeline(new SharedKeyCredential(account, key))
  );

  const queueName = `stress${new Date().getTime()}`;
  const queueURL = QueueURL.fromServiceURL(serviceURL, queueName);

  log(`Creating queue ${queueName}\n`);
  await queueURL.create(Aborter.none);

  log(`Starting stress execution with queue ${queueName} ...\n`);
  const errors = [];
  const retries = [];
  const stats = [];
  await new Promise(resolve => {
    tryNextEnqueue();
    const interval = setInterval(() => {
      if (checkExecutionEnd()) {
        log(`Execution ends detected.\n`);
        clearInterval(interval);
        resolve();
      } else {
        pidusage(process.pid, function(err, stat) {
          stats.push(stat);
          log(JSON.stringify(stat) + "\n");
        });
      }
    }, 1000);
  });
  log(`Execution finished\n`);
  return { retries, errors, stats };

  async function enqueueMessage() {
    try {
      //log(`Worker enqueuing message\n`);
      await enqueue(account, key, queueName, messageContent, retries, options);
      enqueueSucceededCount++;
      messagesInCloudCount++;
      //log(`Enqueued message count: ${enqueueSucceededCount}\n`);
    } catch (error) {
      log(`Enqueue error. Message: ${error.message} Stack: ${error.stack}\n`);
      errors.push({
        type: error.name,
        message: `Enqueue error. Message: ${error.message} Stack: ${
          error.stack
        }`,
        time: new Date().toISOString()
      });
      enqueueFailedCount++;
      log(`Failed to enqueue\n`);
    }

    enqueuingWorkerCount--;

    tryNextEnqueue();
    tryNextDequeue();
  }

  async function dequeueMessage(messageCount) {
    try {
      //log(`Worker dequeuing message\n`);
      await dequeue(
        account,
        key,
        queueName,
        messageContent,
        messageCount,
        retries,
        options
      );
      dequeueSucceededCount++;
      dequeueSucceededMessagesCount += messageCount;
      //log(`Dequeued message count: ${dequeueSucceededCount}\n`);
    } catch (error) {
      log(`Dequeue error. ${JSON.stringify(error)}\n`);
      errors.push({
        type: error.name,
        message: `Dequeue error. Message: ${error.message} Stack: ${
          error.stack
        }`,
        time: new Date().toISOString()
      });
      dequeueFailedCount++;
      dequeueFailedMessagesCount += messageCount;
      log(`Failed to dequeue\n`);
    }

    dequeuingWorkerCount--;

    tryNextEnqueue();
    tryNextDequeue();
  }

  function tryNextEnqueue() {
    while (
      enqueuingWorkerCount < enqueueConcurrency &&
      pendingEnqueueMessageCount > 0
    ) {
      pendingEnqueueMessageCount--;
      enqueuingWorkerCount++;
      enqueueMessage();
    }
  }

  function tryNextDequeue() {
    while (
      dequeuingWorkerCount < dequeueConcurrency &&
      messagesInCloudCount > 0
    ) {
      dequeuingWorkerCount++;
      let messagesToSent =
        messagesInCloudCount >= maxNumberOfMessagesPerReadOp
          ? maxNumberOfMessagesPerReadOp
          : messagesInCloudCount;
      messagesInCloudCount -= messagesToSent;
      dequeueMessage(messagesToSent);
    }
  }

  function checkExecutionEnd() {
    const isFinsh =
      pendingEnqueueMessageCount === 0 &&
      messagesInCloudCount === 0 &&
      enqueuingWorkerCount === 0 &&
      dequeuingWorkerCount === 0;

    log(
      (isFinsh ? `[FINISHED]` : `[EXECUTING]`) +
        ` [Enqueue] pending: ${pendingEnqueueMessageCount}, enqueuing worker count: ${enqueuingWorkerCount}, finished op: ${enqueueSucceededCount}, failed op: ${enqueueFailedCount}\t` +
        `[Dequeue] pending: ${messagesInCloudCount}, dequeuing worker count: ${dequeuingWorkerCount}, finished op: ${dequeueSucceededCount}, failed op: ${dequeueFailedCount}, finshed msg: ${dequeueSucceededMessagesCount}, failed msg: ${dequeueFailedMessagesCount}\n`
    );

    return isFinsh;
  }
}

exports.execute = execute;
