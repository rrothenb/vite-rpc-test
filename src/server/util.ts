import {something} from "./blech";

export const secret = async (message: string): Promise<string> => {
    console.log({message})
    something()
    return 'hello'
}

export const noise = async (): Promise<string> => "hello"

export async function funcit(array: string[], aNum: number): Promise<boolean> {
    console.log({array, aNum})
    return true
}

export const test = () => {
    return 'goodbye'
}
