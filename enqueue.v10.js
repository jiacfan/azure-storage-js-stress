const {
    StorageURL,
    MessagesURL,
    SharedKeyCredential,
    Aborter
} = require("..");
const { InjectPolicyFactory } = require("./injector.v10");

exports.enqueue = async(
    accountName,
    accountKey,
    queueName,
    messageContent,
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

    await messagesURL.enqueue(Aborter.none, messageContent);
};