const azure = require("azure-storage");
const newRetryPolicy = require("./retrypolicy.v2").newRetryPolicy;

exports.dequeue = async(
    accountName,
    accountKey,
    queueName,
    messageContent,
    messageCount,
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

    const gr = await new Promise((resolve, reject) => {
        queueService.getMessages(
            queueName, { numOfMessages: messageCount },
            (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            }
        );
    });

    try {
        // Do self validaton temporarily as stress framework not ready.
        if (gr.length != messageCount) {
            throw new Error(`message counct mismatch, expected: ${messageCount}, actually: ${gr.length}`)
        }

        for (let i = 0; i < gr.length; i++) {
            if (gr[i].messageText.toString() != messageContent) {
                throw new Error(`message content mismatch, expected: ${messageCount}, actually: ${gr[i].messageText.toString()}`)
            }
        }
    } finally {
        // Do delete the messages in the invisible time.
        for (let i = 0; i < gr.length; i++) {
            await new Promise((resolve, reject) => {
                queueService.deleteMessage(
                    queueName, gr[i].messageId, gr[i].popReceipt,
                    (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(res);
                    }
                );
            });
        }
    }
};