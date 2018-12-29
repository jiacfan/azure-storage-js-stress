const Azure = require(".."); // Change to "@azure/storage-queue" in your package

class InjectPolicyFactory {
    constructor(options, retries) {
        this.transferOptions = options;
        this.retries = retries;
        this.counter = 0;
    }
    create(nextPolicy, options) {
        return new InjectPolicy(
            nextPolicy,
            options,
            this.transferOptions,
            this.retries
        );
    }
}

class InjectPolicy extends Azure.BaseRequestPolicy {
    constructor(nextPolicy, options, transferOptions, retries) {
        super(nextPolicy, options);
        this.counter = 0;
        this.transferOptions = transferOptions;
        this.retries = retries;
    }

    async sendRequest(request) {
        this.counter++;
        // console.log(`${request.method} ${request.url} ${this.counter}`);

        if (this.counter > 1) {
            this.retries.push({
                api: `${request.method} ${request.url}`,
                message: ``,
                time: new Date().toISOString()
            });
        }

        // Inject 5xx server fault injection
        // Only works with pre-prod account checkout from here
        // https://xscenarioconsole.azurewebsites.net/AccountPoolAccount
        // Get full list of injectable header values from here
        // https://msazure.visualstudio.com/One/_git/Storage-XStore?path=%2Fsrc%2Fstoragetests%2FTestLibrary%2FConfigs%2FBillingConfiguration.xml&version=GBmaster
        if (Math.random() < this.transferOptions.FaultInjection) {
            request.headers.set(
                "x-ms-test-fe-injection",
                "BeforeProviderExecution;ThrowException;Type=BlobMD5MigrationException;Message=FE Injection"
            );
        }

        return this._nextPolicy.sendRequest(request);
    }
}

exports.InjectPolicyFactory = InjectPolicyFactory;
exports.InjectPolicy = InjectPolicy;