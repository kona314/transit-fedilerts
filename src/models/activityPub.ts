interface ActPubIdentifier {
    id : string 
    type : string
}

export interface Actor extends ActPubIdentifier {
    "@context" : string | any | (string|any)[]
    name : string 
    preferredUsername : string
    type : "Person" | "Application" | "Group" | "Organization" | "Service"
}