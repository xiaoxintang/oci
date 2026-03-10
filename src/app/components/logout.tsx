"use client"
import {Button} from "@/components/ui/button";
import {createBrowserSupabase} from "@/lib/supabase/client";
import {useState} from "react";
import {Spinner} from "@/components/ui/spinner";

export default  function Logout(){
    const supabase = createBrowserSupabase();
    const [loading,setLoading] = useState(false)
    return <Button
        disabled={loading}
        onClick={async ()=>{
            setLoading(true)
            await supabase.auth.signOut()
            setLoading(false)
            window.location.href='/login'
        }}
    >
        {
            loading && <Spinner data-icon="inline-start"/>
        }
        登出
    </Button>
}