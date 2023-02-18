export interface TransitAlert {
    id: string 
    date: Date | null 
    header?: string 
    body?: string 
    entities: TransitAlertEntity[]
}

export interface TransitAlertEntity {
    agencyId?: string 
    routeId?: string 
    directionId?: number  
    routeType?: number  
    stopId?: string 
}