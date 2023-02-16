export default interface ConfigFile {
    services : Service[]
    feeds : Feed[]
}

export interface Service {
    identifier : string 
    name : string 
    displayName? : string 
    iconUrl? : string 
}

export interface Feed {
    url : string 
    headers?: any 
    relatesTo : string[]
}