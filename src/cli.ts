#!/usr/bin/env node
import { Toolkit } from "@aws-cdk/toolkit-lib";
import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { App } from "aws-cdk-lib";
import { Command } from "commander";
import { ProviderStack } from "./provider-stack.js";
import { RoleStack } from "./role-stack.js";

const program = new Command();

program
    .command("deploy <namespace> <repository-name> <repository-uuid>")
    .action(async (namespace: string, repositoryName: string, repositoryUuid: string) => {
        const toolkit = new Toolkit();

        await toolkit.deploy(
            await toolkit.fromAssemblyBuilder(async () => {
                const app = new App();

                const baseProps = {
                    repositoryUuid: repositoryUuid,
                    bitbucketDomain:
                        "api.bitbucket.org/2.0/workspaces/soliantconsulting/pipelines-config/identity/oidc",
                    bitbucketAudience:
                        "ari:cloud:bitbucket::workspace/edf547a3-8e06-4217-abd8-7b9139a21e2c",
                };

                const providerStack = new ProviderStack(app, `${namespace}-provider`, baseProps);

                new RoleStack(app, `${namespace}-role-${repositoryName}`, {
                    ...baseProps,
                    providerStack,
                });

                return app.synth();
            }),
        );
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

        process.stdout.write(output.OutputValue);
    });

await program.parseAsync();
