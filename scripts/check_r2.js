const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// R2 client configuration
const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const bucketName = process.env.R2_BUCKET_NAME || 'manifestmystory-audio';

const run = async () => {
    try {
        const response = await s3.send(new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: 'system/soundscapes/'
        }));
        console.log(JSON.stringify(response.Contents, null, 2));
    } catch (e) {
        console.error('Error listing objects:', e);
    }
};

run();
