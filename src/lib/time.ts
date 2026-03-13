import dayjs from 'dayjs'
export function toLocalString(dateStr:string|null){
    if(!dateStr){
        return '--'
    }
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss').toString()
}