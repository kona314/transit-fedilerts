import { ActivityPubExpress } from "activitypub-express"
import { MongoClient } from "mongodb"
import { SimpleIntervalJob, AsyncTask } from "toad-scheduler"
import { TransitAlert } from "../models/alert"
import { Feed, FeedRelationToService } from "../models/config"
import fetchAlerts from "./fetchFeed"
import generateActivityForAlert from "./generateActivityForAlert"

export default async function makeRefreshJobs(feeds: Feed[], apex: ActivityPubExpress, client: MongoClient) : Promise<SimpleIntervalJob[]> {
    const db =  client.db(process.env.MONGO_DB_NAME ?? 'transitFedilerts')
    const collection = db.collection('transitSeenAlerts')
    const index = [ 'service', 'feedUrl', 'alertId' ]
    await collection.createIndex(index)

    return feeds
        .map(feed => {
            const task = new AsyncTask('service-'+feed.url+'-fetch', async () => {
                console.log('fetching updates')
                const alerts = await fetchAlerts(feed)
                return alerts.flatMap(async (alert) => {
                    feed.relatesTo.map(async (service) => {
                        //ignore non-alerts or unrelated alerts
                        if (!alertRelates(alert, service)) {
                            return Promise.resolve()
                        }
                        const serviceId = typeof service == "string" ? service : service.identifier
                        const alertInfo = {service: serviceId, url: feed.url, alertId: alert.id}
                        const exists = await collection.findOne(alertInfo)
                        if (exists) {
                            return Promise.resolve()
                        }
                        return generateActivityForAlert(alert, serviceId, apex)
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
            })
            return new SimpleIntervalJob({minutes: feed.pollInterval ?? 5, runImmediately: true}, task, {preventOverrun: true})
        })
}

function alertRelates(alert: TransitAlert, relation: FeedRelationToService) {
    if (typeof relation == "string") {
        return true 
    } else if (relation.criteria?.length == 0 ?? true) {
        return true 
    }
    //those cases are easy and have no critera, if we're here we need to check criteria 
    for (let c of relation.criteria ?? []) {
        for (let [prop, val] of Object.entries(c)) {
            if (typeof val == "string") {
                //@ts-expect-error (doesn't like accessing property with string)
                return alert.entities.find(e => e[prop] == val) != null 
            } else if (val.test) {
                //@ts-expect-error (as above + isn't sure what `val` is but we are)
                return alert.entities.find(e => (new RegExp(val.test, val.flags)).test(e[prop])) != null 
            }
        }
    }
    //should only be reached if there are criteria defined but no informed entities
    return false 
}