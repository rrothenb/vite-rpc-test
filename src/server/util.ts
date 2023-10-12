import {something} from "./other";

export const secret = async (message: string): Promise<string> => {
    const constant = 1
    const functor = () => true
    console.log({message, constant, functor})
    something()
    return `${message}!`
}

export const noise = async (): Promise<string> => "hello"

export async function funcit(array: string[], aNum: number): Promise<boolean> {
    console.log({array, aNum})
    return true
}

export const test = () => {
    return 'goodbye'
}
