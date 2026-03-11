"use client"
import Upload from "@/components/upload";

export default function UploadTest(){
    return <Upload onChange={url=>console.log('onchange url',url)}/>
}