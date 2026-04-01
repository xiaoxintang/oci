'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export type UploadChangePayload = {
  key?: string;
  url: string;
};

type UploadProps = {
  initialUrl?: string;
  onChange?: (payload: UploadChangePayload) => void;
  prefix?: string;
};

export default function Upload({ initialUrl, onChange, prefix }: UploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [src, setSrc] = useState<string | undefined>(initialUrl);
  const [publicUrl, setPublicUrl] = useState<string | undefined>(initialUrl);

  const onPick = () => {
    if (loading) {
      return;
    }

    setSrc('');
    setPublicUrl('');
    fileRef.current?.click?.();
  };

  return (
    <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-muted/20">
      {!publicUrl ? (
        <Button className="absolute z-10" type="button" onClick={onPick}>
          {loading ? <Spinner /> : null}
          上传
        </Button>
      ) : null}
      {src && !loading ? (
        <Image
          alt="预览"
          className="cursor-pointer object-cover"
          fill
          src={src}
          unoptimized
          onClick={onPick}
        />
      ) : null}
      <Input
        ref={fileRef}
        hidden
        className="hidden"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0];

          if (!file) {
            return;
          }

          setLoading(true);

          try {
            const reader = new FileReader();
            reader.onload = () => {
              setSrc(reader.result as string);
            };
            reader.readAsDataURL(file);

            const response = await fetch('/api/bucket/sign', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                fileName: file.name,
                contentType: file.type,
                prefix,
              }),
            }).then((res) => res.json());

            await fetch(response.signedUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
              },
            });

            setPublicUrl(response.publicUrl);
            onChange?.({
              key: response.key,
              url: response.publicUrl,
            });
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}
