export default interface ConfigFile {
    services : ServiceFeed[]
}

export interface FeedUrlWithHeaders {
    url: string
    headers?: any
}

export type FeedUrl = string | FeedUrlWithHeaders

export interface ServiceFeed {
    identifier : string 
    gtfsRtAlerts : FeedUrl[]
    serviceName : string 
    displayName? : string 
}