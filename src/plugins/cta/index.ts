import { TransitAlert, TransitAlertEntity } from '../../models/alert'
import { Feed } from '../../models/config'
import { DateTime } from 'luxon'

async function fetchFeed(feed: Feed) {
    const res = await fetch(feed.url, { headers: feed.headers })
    if (!res.ok) {
        const error = new Error(`${res.url}: ${res.status} ${res.statusText}`)
        throw error
    }
    return await res.json()
}

function convertToTransitAlert(alert: any) : TransitAlert {
    const impacts : any[] = Array.isArray(alert.ImpactedService.Service) ? alert.ImpactedService.Service : [alert.ImpactedService.Service]
    const entities = impacts.map(i => convertImpactedService(i))
    const date = DateTime.fromISO(alert.EventStart, { zone: 'America/Chicago' })
    return {
        id: alert.AlertId, 
        header: alert.Headline, 
        body: alert.ShortDescription, //FullDescription["#cdata-section"] also an option, but really long and full of tags
        date: date.toJSDate(),
        entities,
    }
}

function convertImpactedService(i: any) : TransitAlertEntity {
    const routeId = ["R","B"].includes(i.ServiceType) ? i.ServiceId : undefined
    const stopId = i.ServiceType == "T" ? i.ServiceId : undefined
    const routeType = i.ServiceType == "B" ? 3 : i.ServiceType == "R" ? 1 : undefined
    return {
        routeId,
        stopId,
        routeType,
    }
}

export default async function getCTAAlerts(feed: Feed) {
    return fetchFeed(feed)
    .then(f => f.CTAAlerts.Alert)
    .then((alerts: any[]) => alerts.map((a: any) => convertToTransitAlert(a)))
}