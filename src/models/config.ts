export default interface ConfigFile {
    services : Service[]
}

export interface FeedUrlWithData {
    url: string
    headers?: any
}

export type FeedUrl = string | FeedUrlWithData

export interface Service {
    identifier : string 
    gtfsRtAlerts : FeedUrl[]
    serviceName : string 
    displayName? : string 
}