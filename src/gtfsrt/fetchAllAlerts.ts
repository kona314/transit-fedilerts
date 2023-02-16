import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import {Feed} from "../models/config"

export default async function fetchFeed(feed: Feed) {
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