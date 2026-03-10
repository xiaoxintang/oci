'use client'
import {Button} from "@/components/ui/button";
import {createBrowserSupabase} from "@/lib/supabase/client";

export default function Login(){
    const supabase = createBrowserSupabase()
    return <div>
        <Button
            onClick={async ()=>{
                const { data, error } = await supabase.auth.signUp({
                    email: 'valid.email@supabase.io',
                    password: 'example-password',
                    options: {
                        // emailRedirectTo: 'https://localhost:3000/',
                    },
                })
            }}
        >注册</Button>
        <Button onClick={async ()=>{
            const { data, error } = await supabase.auth.signInWithPassword({
                email: 'valid.email@supabase.io',
                password: 'example-password',
            })
        }}>登录</Button>
    </div>
}