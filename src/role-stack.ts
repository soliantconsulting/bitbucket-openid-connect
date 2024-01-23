import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import type { ProviderStack } from "./provider-stack.js";

type BitbucketStackProps = cdk.StackProps & {
    readonly repositoryUuid: string;
    readonly bitbucketAudience: string;
    readonly bitbucketDomain: string;
    readonly providerStack: ProviderStack;
};

export class RoleStack extends cdk.Stack {
    public constructor(scope: Construct, id: string, props: BitbucketStackProps) {
        super(scope, id, props);

        const conditions: iam.Conditions = {
            StringEquals: {
                [`${props.bitbucketDomain}:aud`]: props.bitbucketAudience,
            },
            StringLike: {
                [`${props.bitbucketDomain}:sub`]: `${props.repositoryUuid}:*`,
            },
        };

        const role = new iam.Role(this, "BitbucketDeployRole", {
            assumedBy: new iam.WebIdentityPrincipal(
                props.providerStack.provider.openIdConnectProviderArn,
                conditions,
            ),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")],
            description:
                "This role is used via Bitbucket pipelines to deploy with AWS CDK or Terraform on the customers AWS account",
            maxSessionDuration: cdk.Duration.hours(2),
        });

        new cdk.CfnOutput(this, "RoleArn", {
            value: role.roleArn,
        });
    }
}
