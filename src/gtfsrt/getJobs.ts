import { ActivityPubExpress } from "activitypub-express"
import { MongoClient } from "mongodb"
import { SimpleIntervalJob, AsyncTask } from "toad-scheduler"
import { ServiceFeed } from "../models/config"
import fetchAllAlerts from "./fetchAllAlerts"
import generateActivityForAlert from "./generateActivityForAlert"

export default async function makeRefreshJobs(feeds: ServiceFeed[], apex: ActivityPubExpress, client: MongoClient) {
    const db =  client.db(process.env.MONGO_DB_NAME ?? 'transitFedilerts')
    const collection = db.collection('transitSeenAlerts')
    const index = [ 'service', 'feedUrl', 'alertId' ]
    await collection.createIndex(index)

    return feeds
        .map(feed => new AsyncTask('service-'+feed.identifier+'-fetch', async () => {
            console.log('fetching updates')
            const alertsByFeed = await fetchAllAlerts(feed)
            return alertsByFeed.flatMap((f, i) => {
                const u = feed.gtfsRtAlerts[i]
                const feedUrl = typeof u == "string" ? u : u.url
                return f.map(async (a) => {
                    if (!a.alert) {
                        return Promise.resolve()
                    }
                    const alertInfo = {service: feed.identifier, feedUrl, alertId: a.id}
                    const exists = await collection.findOne(alertInfo)
                    if (exists) {
                        return Promise.resolve()
                    }
                    return generateActivityForAlert(a.alert, feed.identifier, apex)
                        .then(async (activity) => {
                            const actor = await apex.store.getObject(activity.actor[0], true)
                            await Promise.all([
                                apex.store.saveObject(activity.object[0]),
                                apex.addToOutbox(actor, activity),
                            ])
                            await collection.insertOne(alertInfo)
                            console.log(activity)
                        })
                })
            })
        }))
        .map(task => new SimpleIntervalJob({minutes: 5, runImmediately: true}, task, {preventOverrun: true}))
}