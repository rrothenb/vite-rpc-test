import {something} from "./blech.js";

export const secret = (message) => {
    console.log({message})
    something()
    return 'hello'
}

export const noise = () => {
    console.log('blah blah blah')
}
