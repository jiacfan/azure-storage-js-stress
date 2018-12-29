const azure = require("azure-storage");
const newRetryPolicy = require("./retrypolicy.v2").newRetryPolicy;

exports.enqueue = async(
    accountName,
    accountKey,
    queueName,
    messageContent,
    retries,
    options
) => {
    const queueService = azure
        .createQueueService(
            accountName,
            accountKey,
            `https://${accountName}.queue.${options.EndpointSuffix}/`
        )
        .withFilter(newRetryPolicy(options));

    await new Promise((resolve, reject) => {
        queueService.createMessage(
            queueName, messageContent,
            (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            }
        );
    });
};