import {ActivityPubExpress} from 'activitypub-express'
import {transit_realtime} from 'gtfs-realtime-bindings'

/**
 * Returns an object of type `Note` for the given alert and an activity of type `Create` for the Note.
 */
export default async function generateActivityForAlert(alert: transit_realtime.IAlert, actor: string, apex: ActivityPubExpress) {
    const desc = alert.descriptionText?.translation?.[0]?.text 
    const head = alert.headerText?.translation?.[0]?.text
    const alertContent = [head, desc].filter(t => t).join("<br><br>")
    const start = alert.activePeriod?.[0]?.start
    const now = new Date()
    const alertDate = start ? new Date(Number(start) * 1000) : now 
    //for simplicity, we're going to flatten down future-dated alerts to now
    //TODO: Find a better way to represent future-dated alerts, maybe this: https://www.w3.org/TR/activitystreams-vocabulary/#dfn-published
    const postDate = alertDate > now ? now : alertDate
    const actorId = apex.utils.usernameToIRI(actor)
    const followersAt = actorId + "/followers"
    const note = buildPublicNote(apex, alertContent, actorId, postDate, followersAt)
    const activity = await apex.buildActivity('Create', actorId, "https://www.w3.org/ns/activitystreams#Public", {
        object: note,
        cc: followersAt, //followers uri
    })
    return activity
}

function buildPublicNote(apex: ActivityPubExpress, content: string, actorId: string, published: Date, cc: string) {
    const id : string = apex.store.generateId()
    return {
        id: apex.utils.objectIdToIRI(id),
        type: "Note",
        content,
        attributedTo: actorId,
        published: published.toISOString(),
        to: "https://www.w3.org/ns/activitystreams#Public",
        cc,
    }
}