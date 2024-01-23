import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

type ProviderStackProps = cdk.StackProps & {
    readonly bitbucketAudience: string;
    readonly bitbucketDomain: string;
};

export class ProviderStack extends cdk.Stack {
    public readonly provider: iam.OpenIdConnectProvider;

    public constructor(scope: Construct, id: string, props: ProviderStackProps) {
        super(scope, id, props);

        this.provider = new iam.OpenIdConnectProvider(this, "BitbucketProvider", {
            url: `https://${props.bitbucketDomain}`,
            clientIds: [props.bitbucketAudience],
        });
    }
}
