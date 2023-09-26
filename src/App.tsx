import {useEffect, useState} from 'react'
import './App.css'
import {secret} from "./server/util";

function App() {
    const [value, setValue] = useState('')

    useEffect(() => {
        (async () => {
            setValue(await secret('howdy'))
        })();
    }, [value])

    return (
        <div>
            secret is {value}
        </div>
    )
}

export default App
