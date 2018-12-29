const {
    StorageURL,
    MessagesURL,
    MessageIdURL,
    SharedKeyCredential,
    Aborter
} = require("..");
const { InjectPolicyFactory } = require("./injector.v10");

exports.dequeue = async(
    accountName,
    accountKey,
    queueName,
    messageContent,
    messageCount,
    retries,
    options
) => {
    const pipeline = StorageURL.newPipeline(
        new SharedKeyCredential(accountName, accountKey), {
            retryOptions: {
                maxTries: options.MaxRetry + 1
            }
        }
    );
    const crendential = pipeline.factories.pop();
    pipeline.factories.push(new InjectPolicyFactory(options, retries));
    pipeline.factories.push(crendential);

    const messagesURL = new MessagesURL(
        `https://${accountName}.queue.${
      options.EndpointSuffix
    }/${queueName}/messages`,
        pipeline
    );

    const dr = await messagesURL.dequeue(Aborter.none, {
        numberOfMessages: messageCount,
        visibilitytimeout: 60 * 10 // 10 minutes
    });

    try {
        // Do self validaton temporarily as stress framework not ready.
        if (dr.dequeuedMessageItems.length != messageCount) {
            throw new Error(`message counct mismatch, expected: ${messageCount}, actually: ${dr.dequeuedMessageItems.length}`)
        }

        for (let i = 0; i < dr.dequeuedMessageItems.length; i++) {
            if (dr.dequeuedMessageItems[i].messageText != messageContent) {
                throw new Error(`message content mismatch, expected: ${messageCount}, actually: ${dr.dequeuedMessageItems[i].messageText}`)
            }
        }
    } finally {
        // Do delete the messages in the invisible 30 seconds.
        for (let i = 0; i < dr.dequeuedMessageItems.length; i++) {
            const messageIdURL = MessageIdURL.fromMessagesURL(messagesURL, dr.dequeuedMessageItems[i].messageId);
            await messageIdURL.delete(Aborter.none, dr.dequeuedMessageItems[i].popReceipt);
        }
    }
};