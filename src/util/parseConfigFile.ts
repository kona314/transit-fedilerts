import fs from 'fs/promises'
import ConfigFile from '../models/config'

export default async function parseConfigFile() {
    return fs.readFile(process.env.SERVICES_JSON ?? 'services.json', 'utf-8')
    .then(file => {
        return JSON.parse(file) as ConfigFile
    })
}