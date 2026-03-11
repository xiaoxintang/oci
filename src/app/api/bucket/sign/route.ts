// app/api/upload/route.ts (Next.js App Router 示例)
import { NextResponse, NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

export async function POST(request: NextRequest) {
    try {
        const { fileName, contentType } = await request.json();

        if (!fileName || !contentType) {
            return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
        }

        const key = `uploads/${crypto.randomUUID()}-${fileName}`; // 自訂路徑，避免碰撞

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            ContentType: contentType,
            // 可加 ACL: 'public-read' 如果 bucket public
        });

        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 2 * 60 }); // 2分钟

        // const publicUrl = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
        const publicUrl = `https://file.xiaoxt.online/${key}`;
        // 或用 custom domain: https://files.yourdomain.com/${key}

        return NextResponse.json({ signedUrl, publicUrl, key });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }
}