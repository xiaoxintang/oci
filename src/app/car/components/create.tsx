'use client'
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Database} from "@/types/database.types";
import {Controller, useForm} from "react-hook-form";
import {updateCar} from "@/app/car/actions";

export default function CreateCar(props: { defaultValue: Database['public']['Tables']['car']['Insert'] }) {

    const {control, handleSubmit} = useForm({
        defaultValues: props.defaultValue
    })
    const onSubmit = async (values)=>{
        // "use server"
        console.log('values==>',values)
        // const supabase = await createServerSpabase();
        // await supabase.from('car').update({name:values.name}).eq('id',values.id)
        // revalidatePath('/car','page')
        await updateCar(values)

    }
    return <Dialog>
        <form onSubmit={handleSubmit(onSubmit)} id={'car-form'}>
            <DialogTrigger asChild>
                <Button>编辑</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                <DialogHeader>车辆编辑</DialogHeader>
                </DialogTitle>
                <FieldGroup>
                    <Controller
                        control={control} render={({field, fieldState}) => {
                        return <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={'name'}>品牌型号</FieldLabel>
                            <Input id={'name'} aria-invalid={fieldState.invalid} {...field} autoComplete={'off'}/>
                        </Field>
                    }}
                        name={'name'}
                    />
                    <Controller
                        control={control}
                        render={({field,fieldState})=>{
                            return <Field>
                                <FieldLabel htmlFor={'buy_at'} data-invalid={fieldState.invalid}>购买时间</FieldLabel>
                                <Input id={'buy_at'} aria-invalid={fieldState.invalid} {...field}/>
                            </Field>
                        }}
                        name={'buy_at'}
                    />

                </FieldGroup>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={'outline'}>取消</Button>
                    </DialogClose>
                    <Button type={'submit'} form={'car-form'}>提交</Button>
                </DialogFooter>
            </DialogContent>
        </form>
    </Dialog>

}