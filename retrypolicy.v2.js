const azure = require("azure-storage");

function newRetryPolicy(options) {
    const retryPolicy = new azure.ExponentialRetryPolicyFilter(options.MaxRetry);

    retryPolicy.shouldRetry = function(statusCode, requestOptions) {
        // console.log('ExponentialRetryPolicyFilter2: Made the request at ' + new Date().toUTCString() + ', received StatusCode: ' + statusCode);

        var retryData = (requestOptions && requestOptions.retryContext) ? requestOptions.retryContext : {};

        // Adjust retry interval
        var incrementDelta = Math.pow(2, retryData.retryCount) - 1;
        var boundedRandDelta = this.retryInterval * 0.8 + Math.floor(Math.random() * (this.retryInterval * 1.2 - this.retryInterval * 0.8));
        incrementDelta *= boundedRandDelta;

        retryData.retryInterval = Math.min(this.minRetryInterval + incrementDelta, this.maxRetryInterval);

        var result = azure.RetryPolicyFilter._shouldRetryOnError(statusCode, requestOptions);

        if (statusCode >= 500 && statusCode < 600) {
            // Retry on the server error
            result.retryable = true;
            result.lastServerError = true;
        }
        // console.log(`Should retry? ${JSON.stringify(result)}`);
        return result;
    };

    return retryPolicy;
};

exports.newRetryPolicy = newRetryPolicy;