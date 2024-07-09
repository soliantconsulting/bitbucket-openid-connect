#!/usr/bin/env node
import {
    AwsCdkCli,
    type ICloudAssemblyDirectoryProducer,
    RequireApproval,
} from "@aws-cdk/cli-lib-alpha";
import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { App, type AppProps } from "aws-cdk-lib";
import { Command } from "commander";
import { ProviderStack } from "./provider-stack.js";
import { RoleStack } from "./role-stack.js";

class Producer implements ICloudAssemblyDirectoryProducer {
    public constructor(
        private namespace: string,
        private repositoryName: string,
        private repositoryUuid: string,
    ) {}

    public async produce(context: AppProps["context"]): Promise<string> {
        const app = new App({ context });

        const baseProps = {
            repositoryUuid: this.repositoryUuid,
            bitbucketDomain:
                "api.bitbucket.org/2.0/workspaces/soliantconsulting/pipelines-config/identity/oidc",
            bitbucketAudience:
                "ari:cloud:bitbucket::workspace/edf547a3-8e06-4217-abd8-7b9139a21e2c",
        };

        const providerStack = new ProviderStack(app, `${this.namespace}-provider`, baseProps);

        new RoleStack(app, `${this.namespace}-role-${this.repositoryName}`, {
            ...baseProps,
            providerStack,
        });

        return app.synth().directory;
    }
}

const program = new Command();

program
    .command("deploy <namespace> <repository-name> <repository-uuid>")
    .action(async (namespace: string, repositoryName: string, repositoryUuid: string) => {
        const cli = AwsCdkCli.fromCloudAssemblyDirectoryProducer(
            new Producer(namespace, repositoryName, repositoryUuid),
        );

        await cli.deploy({
            requireApproval: RequireApproval.NEVER,
        });
    });

program
    .command("get-role-arn <namespace> <repository-name>")
    .action(async (namespace: string, repositoryName: string) => {
        const cf = new CloudFormation();
        const result = await cf.describeStacks({
            StackName: `${namespace}-role-${repositoryName}`,
        });

        if (!result.Stacks?.[0]) {
            throw new Error(`Could not locate ${namespace}-role-${repositoryName} stack`);
        }

        const stack = result.Stacks[0];
        const output = stack.Outputs?.find((output) => output.OutputKey === "RoleArn");

        if (!output?.OutputValue) {
            throw new Error("Could not find RoleArn output");
        }

        console.log(output.OutputValue);
    });

await program.parseAsync();
