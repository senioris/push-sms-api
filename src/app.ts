import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * SNS Topic経由でSMS送信処理
 * @param topicArn SNS TopicのARN
 * @param message 送信メッセージ
 */
const sendSms = async (topicArn: string, message: string): Promise<void> => {
    const params = {
        TopicArn: topicArn,
        Message: message,
    };

    try {
        const command = new PublishCommand(params);
        const result = await snsClient.send(command);
        console.log('SMS sent successfully:', result.MessageId);
    } catch (error) {
        console.error('Failed to send SMS:', error);
        throw error;
    }
};

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // Authorizationヘッダーまたはクエリパラメータをチェック
        const expectedAuth = process.env.AUTH_TOKEN;
        if (!expectedAuth) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'AUTH_TOKEN environment variable is not set',
                }),
            };
        }

        // ヘッダーから取得
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        // クエリパラメータから取得
        const authQuery = event.queryStringParameters?.Authorization || event.queryStringParameters?.authorization;

        // どちらかに一致する値があればOK
        if ((authHeader !== expectedAuth) && (authQuery !== expectedAuth)) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized: Invalid or missing Authorization',
                }),
            };
        }

        // 環境変数からSNS Topic ARNを取得
        const topicArn = process.env.SNS_TOPIC_ARN;
        if (!topicArn) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'SNS_TOPIC_ARN environment variable is not set',
                }),
            };
        }

        // 固定メッセージ
        const message = '予約が取れるかも！ <https://ssc3.doctorqube.com/mukainada-mc/>';

        // SMS送信
        await sendSms(topicArn, message);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'SMS sent successfully',
                topicArn: topicArn,
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to send SMS',
                error: err instanceof Error ? err.message : 'Unknown error',
            }),
        };
    }
};
