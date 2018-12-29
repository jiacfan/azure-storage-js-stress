const optionDefinitions = [{
        name: "EnqueueConcurrency",
        type: Number,
        defaultValue: 100,
        description: "Overall enqueue concurrency - how many workers will be execute enqueue at the same time"
    },
    {
        name: "DequeueConcurrency",
        type: Number,
        defaultValue: 100,
        description: "Overall dequeue concurrency - how many workers will be execute dequeue at the same time"
    },
    {
        name: "PeekConcurrency",
        type: Number,
        defaultValue: 10,
        description: "Overall peek concurrency - how many workers will be execute peek at the same time"
    },
    {
        name: "NumberOfMessages",
        type: Number,
        defaultValue: 1,
        description: "Number of messages to test in one pass(enqueue->dequeue)"
    },
    {
        name: "MessageSizeInBytes",
        type: Number,
        defaultValue: 64 * 1024,
        description: "Message size"
    },
    {
        name: "Rounds",
        type: Number,
        defaultValue: 1,
        description: "Rounds to execute"
    },
    {
        name: "Legacy",
        type: String,
        defaultValue: "true",
        description: "Use legacy v2 SDK for testing instead of V10"
    },
    {
        name: "MaxNumberOfMessagesPerReadOp",
        type: Number,
        defaultValue: 10,
        description: "Number of messages to dequeue/peek once per operation"
    },
    {
        name: "MaxRetry",
        type: Number,
        defaultValue: 10,
        description: "Max retries for retry policy"
    },
    {
        name: "FaultInjection",
        type: Number,
        defaultValue: 0.05,
        description: "Fault injection rate for server returning 5XX errors"
    },
    {
        name: "AccountName",
        type: String,
        description: "Storage account name"
    },
    {
        name: "AccountKey",
        type: String,
        description: "Storage account key"
    },
    {
        name: "EndpointSuffix",
        type: String,
        defaultValue: "core.windows.net",
        description: "Storage account endpoint suffix"
    },
    {
        name: "Log",
        type: String,
        defaultValue: "./",
        description: "Default log path"
    }
];

exports.optionDefinitions = optionDefinitions;