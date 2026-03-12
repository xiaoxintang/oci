import {createServerSpabase} from "@/lib/supabase/server";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

export default async function Car(){
const supabase = await createServerSpabase()
    const cars = await supabase.from('car').select("id, name")
    await supabase.from.
    return <div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>id</TableHead>
                    <TableHead>名字</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {
                    cars.data?.map(el=>{
                        return <TableRow key={el.id}>
                            <TableCell>{el.id}</TableCell>
                            <TableCell>{el.name}</TableCell>
                        </TableRow>
                    })
                }
            </TableBody>
        </Table>
    </div>
}