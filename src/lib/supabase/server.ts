import { createServerClient } from '@supabase/ssr'
import {createClient} from "@supabase/supabase-js";
import { cookies } from 'next/headers'
import {Database} from "@/types/database.types";

export async function createServerSupabase() {
    // 这是“给服务端页面 / Server Action 用”的 Supabase client。
    // 它会带上当前请求的 cookie，所以能识别当前登录用户是谁。
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // 读取当前请求里的全部 Supabase auth cookie
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        // 当 Supabase 需要刷新 session 时，把新的 cookie 写回去
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
export async function createAdminSupabase(){
    // 这是“管理员权限”的 client，使用 service role key。
    // 它会绕过 RLS，所以只能在服务端使用，不能暴露给浏览器。
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
}
