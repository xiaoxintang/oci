'use client';

import Upload from '@/components/upload';

export default function UploadTest() {
  return <Upload onChange={(result) => console.log('upload result', result)} />;
}
