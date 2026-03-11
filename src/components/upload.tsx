"use client"
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useRef, useState} from "react";
import {Spinner} from "@/components/ui/spinner";
interface UploadProps{
    onChange?:(url:string)=>void
}
export default function Upload(props:UploadProps){
    const fileRef = useRef<HTMLInputElement>(null);
    const [loading,setLoading] = useState(false)
    const [src,setSrc] = useState<string>()
    const [publicUrl,setPublicUrl] = useState<string>()
    const onPick = ()=>{
        if(loading){
            return
        }
        setSrc('')
        setPublicUrl('')
        fileRef.current?.click?.()
    }
    return <div className={'w-[80px] h-[80px] relative flex justify-center items-center'}>
        {
            !publicUrl && <Button
            className={'absolute z-10'}
            onClick={() => {
                onPick()
            }}
        >
            {loading && <Spinner/>}
            上传
        </Button>
        }
        {src && !loading && <img
            className={'w-full h-full block'}
            src={src}
            onClick={()=>{
                onPick()
            }}
            alt={'预览'}
        />}
        <Input
            className={'hidden'}
            hidden
            ref={fileRef}
            type={'file'}
            onChange={async event => {
                console.log('event',event)
                setLoading(true)
                try {
                    const reader = new FileReader()
                    reader.onload = e => {
                        console.log('on load', e)
                        console.log('reader result', reader.result)
                        setSrc(reader.result as string)
                    }
                    reader.readAsDataURL(event.target.files?.[0] as File)
                    if(props.onChange) {
                        const resp = await fetch('/api/bucket/sign', {
                            method: "POST",
                            headers: {
                                "content-type": "application/json"
                            },
                            body: JSON.stringify({
                                fileName: event.target.files?.[0]?.name,
                                contentType: event.target.files?.[0]?.type
                            })
                        }).then(res => res.json())
                        const uploadRes = await fetch(resp.signedUrl, {
                            method: "PUT",
                            body: event.target.files?.[0],
                            headers: {
                                'Content-Type': event.target.files?.[0].type || 'application/octet-stream'
                                // 如果后端 presign 时指定了其他 header，这里也要匹配
                            }
                        })
                        console.log('uploadRes==>', uploadRes)
                        console.log('publicUrl==>', resp.publicUrl)
                        setPublicUrl(resp.publicUrl)
                        props.onChange(resp.publicUrl)
                    }
                } finally {
                    setLoading(false)
                }
            }}
        />
    </div>
}