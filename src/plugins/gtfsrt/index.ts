import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import { TransitAlert, TransitAlertEntity } from '../../models/alert'
import {Feed} from "../../models/config"

async function fetchFeed(feed: Feed) {
    const res = await fetch(feed.url, { headers: feed.headers })
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

function convertAlertToTransitAlert(feedEntity: GtfsRealtimeBindings.transit_realtime.IFeedEntity) : TransitAlert {
    if (!feedEntity.alert) {
        throw new Error("provided an entity without an alert") 
    }
    const start = feedEntity.alert.activePeriod?.[0]?.start
    const alertDate = start ? new Date(Number(start) * 1000) : null 
    const body = feedEntity.alert.descriptionText?.translation?.[0]?.text
    const header = feedEntity.alert.headerText?.translation?.[0]?.text
    const entities = feedEntity.alert.informedEntity?.map(e => convertAlertEntityToTransitAlertEntity(e)) ?? []
    return {
        id: feedEntity.id,
        date: alertDate, 
        entities,
        body, header
    }
}

function convertAlertEntityToTransitAlertEntity(entity: GtfsRealtimeBindings.transit_realtime.IEntitySelector) : TransitAlertEntity {
    return {
        agencyId: entity.agencyId ?? undefined,
        routeId: entity.routeId ?? undefined,
        directionId: entity.directionId ?? undefined,
        routeType: entity.routeType ?? undefined,
        stopId: entity.stopId ?? undefined,
    } 
}

export default async function getAlertsFromGtfsRt(feed: Feed) {
    return fetchFeed(feed)
    .then(f => f.filter(f => f.alert != null))
    .then(alerts => alerts.map(a => convertAlertToTransitAlert(a)))
}