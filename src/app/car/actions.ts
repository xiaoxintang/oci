'use server'
import {createServerSupabase} from "@/lib/supabase/server";
import {revalidatePath} from "next/cache";
import {Database} from "@/types/database.types";
type CarInsert = Database['public']['Tables']['car']['Insert']
export async function updateCar(values:CarInsert){
    // 在 action 里加这行
    console.log('update car==>',values)
    const supabase = await createServerSupabase();
    const res = await supabase.from('car').update({name:values.name}).eq('id',values.id as string).select()
    console.log('res=>',res)
    revalidatePath('/car')
}