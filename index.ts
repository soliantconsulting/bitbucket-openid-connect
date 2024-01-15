import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

type BitbucketStackProps = cdk.StackProps & {
    readonly repositoryUuid: string;
    readonly bitbucketAudience: string;
    readonly bitbucketDomain: string;
};

export class BitbucketStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: BitbucketStackProps) {
        super(scope, id, props);

        const bitbucketProvider = new iam.OpenIdConnectProvider(this, "BitbucketProvider", {
            url: `https://${props.bitbucketDomain}`,
            clientIds: [props.bitbucketAudience],
        });

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
                bitbucketProvider.openIdConnectProviderArn,
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

const app = new cdk.App();
const stackSuffix = app.node.tryGetContext("stackSuffix");
const repositoryUuid = app.node.tryGetContext("repositoryUuid");

if (typeof stackSuffix !== "string") {
    console.error("Missing stackSuffix context variable");
    process.exit(1);
}

if (typeof repositoryUuid !== "string") {
    console.error("Missing repositoryUuid context variable");
    process.exit(1);
}

new BitbucketStack(app, `BitbucketOpenIDConnect-${stackSuffix}`, {
    repositoryUuid,
    bitbucketDomain:
        "api.bitbucket.org/2.0/workspaces/soliantconsulting/pipelines-config/identity/oidc",
    bitbucketAudience: "ari:cloud:bitbucket::workspace/edf547a3-8e06-4217-abd8-7b9139a21e2c",
});

app.synth();
