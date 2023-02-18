import { Feed } from "../models/config"
import getAlertsFromGtfsRt from "../plugins/gtfsrt"
import getAlertsFromCta from "../plugins/cta"

export default async function fetchFeed(feed: Feed) {
    if (feed.relatesTo.length == 0) {
        //if feed has no service to talk to, no need to fetch
        return []
    }
    const feedType = feed.type ?? "gtfsrt"
    if (feedType == "gtfsrt") {
        const res = await getAlertsFromGtfsRt(feed)
        return res 
    } else if (feedType == "cta") {
        const res = await getAlertsFromCta(feed)
        return res 
    }
    throw new Error(`invalid feed type "${feed.type}" defined for ${feed.url}`)
}