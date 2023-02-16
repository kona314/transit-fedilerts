export default interface ConfigFile {
    services : Service[]
    feeds : Feed[]
}

export interface Service {
    identifier : string 
    name : string 
    displayName? : string 
    iconUrl? : string 
    summaryNote? : string 
}

export interface Feed {
    url : string 
    headers?: any 
    relatesTo : FeedRelationToService[]
}

export interface FeedServiceRelationRegexCriteriaValue {
    test: string 
    flags?: string
}

export type FeedServiceRelationCriteriaValue = string | FeedServiceRelationRegexCriteriaValue

export interface FeedServiceRelationCriteria {
    [entityField: string]: FeedServiceRelationCriteriaValue
}

export interface FeedRelationToServiceComplex {
    identifier: string 
    criteria?: FeedServiceRelationCriteria[]
}

export type FeedRelationToService = string | FeedRelationToServiceComplex