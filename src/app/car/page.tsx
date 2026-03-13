import {createServerSpabase} from "@/lib/supabase/server";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import CreateCar from "@/app/car/components/create";
import {toLocalString} from "@/lib/time";

export default async function Car(){
    const supabase = await createServerSpabase()
    const cars = await supabase.from('car').select("id, name,created_at,updated_at,buy_at")
    console.log('cars==>',cars)
    // await supabase.from('car').insert({
    //     name:'比亚迪驱逐舰05',
    //     buy_at:dayjs().toISOString(),
    // })
    return <div>

        <Table>
            <TableHeader>
                <TableRow>
                    {/*<TableHead>id</TableHead>*/}
                    <TableHead>名字</TableHead>
                    <TableHead>购买时间</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead>操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {
                    cars.data?.map(el=>{
                        return <TableRow key={el.id}>
                            {/*<TableCell>{el.id}</TableCell>*/}
                            <TableCell>{el.name}</TableCell>
                            <TableCell>{toLocalString(el.buy_at)}</TableCell>
                            <TableCell>{toLocalString(el.created_at)}</TableCell>
                            <TableCell>{toLocalString(el.updated_at)}</TableCell>
                            <TableCell>
                                <CreateCar defaultValue={el}/>
                            </TableCell>
                        </TableRow>
                    })
                }
            </TableBody>
        </Table>
    </div>
}