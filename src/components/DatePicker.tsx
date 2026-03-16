"use client"

import {useEffect, useState} from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"
import dayjs from "dayjs";
import {toLocalString} from "@/lib/time";
interface DatePickerProps{
    value:Date;
    onChange:(result:Date|undefined)=>void
}
export function DatePicker({value,onChange}:DatePickerProps) {
    const [date, setDate] = useState<Date>()
    const onDatePickerChange = (d:Date|undefined)=>{
        setDate(d)
        onChange(d)
    }
    useEffect(() => {
        setDate(value)
    }, [value]);
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-empty={!date}
                    className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                    {date ? toLocalString(date.toString()) : <span>Pick a date</span>}
                    <ChevronDownIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onDatePickerChange}
                    defaultMonth={date}
                />
            </PopoverContent>
        </Popover>
    )
}
