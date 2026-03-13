'use server'
import {createServerSpabase} from "@/lib/supabase/server";
import {revalidatePath} from "next/cache";

export async function updateCar(values){
    // 在 action 里加这行
    console.log('update car==>',values)
    const supabase = await createServerSpabase();
    const res = await supabase.from('car').update({name:'比亚迪驱逐舰05'}).eq('id',values.id).select()
    console.log('res=>',res)
    revalidatePath('/car')
}