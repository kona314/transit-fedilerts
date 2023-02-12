import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import {ServiceFeed, FeedUrl} from "../models/config"

export default async function fetchAllAlerts(service: ServiceFeed) {
    return Promise.all(
        service.gtfsRtAlerts.map(a => fetchFeed(a))
    )
}

async function fetchFeed(gtfsRtAlertsUrl: FeedUrl) {
    const url = typeof gtfsRtAlertsUrl == "string" ? gtfsRtAlertsUrl : gtfsRtAlertsUrl.url
    const headers = typeof gtfsRtAlertsUrl == "string" ? undefined : gtfsRtAlertsUrl.headers
    const res = await fetch(url, { headers })
    if (!res.ok) {
        const error = new Error(`${res.url}: ${res.status} ${res.statusText}`)
        throw error
    }
    const buffer = await res.arrayBuffer()
    const feedData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
    )
    return feedData.entity 
}