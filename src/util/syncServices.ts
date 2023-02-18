import { ActivityPubExpress, ApexActor } from 'activitypub-express'
import ConfigFile from '../models/config'

export default async function syncServices(file: ConfigFile, apex: ActivityPubExpress) {
    checkConfigValid(file)
    //return promises for updating/creating services as desired
    return Promise.all(
        file.services.map(service => {
            const icon = service.iconUrl ? {type: "Image", url: service.iconUrl} : null 
            if (icon?.url.startsWith("/")) {
                icon.url = "https://" + process.env.DOMAIN + "/f" + icon.url
            }
            const summary = "Automated service alerts for " + service.name + (service.summaryNote ? ". " + service.summaryNote : "")
            const displayName = service.displayName ?? (service.name + " Alerts")
            return apex.createActor(service.identifier, displayName, summary, icon)
        })
    )
    .then((actors) => {
        return Promise.all(actors.map(async (a) => {
            return {
                existingObject: await apex.store.getObject(a.id),
                actor: a,
            }
        }))
    })
    .then(data => {
        return Promise.all(data.map(async (a) => {
            if (a.existingObject != null) {
                const changes = updatedServiceValues(a.actor, a.existingObject)
                if (changes) {
                    await apex.store.updateObject(changes, a.actor.id, false)
                    const updated = await apex.store.getObject(a.actor.id, true)
                    const activity = await apex.buildActivity('Update', a.actor.id, "https://www.w3.org/ns/activitystreams#Public", {
                        object: a.actor.id, 
                        cc: a.actor.id + "/followers",
                    })
                    return apex.addToOutbox(updated, activity)
                } else {
                    return Promise.resolve()
                }
            } else {
                return apex.store.saveObject(a.actor)
            }
        }))
    })
}

function updatedServiceValues(expected: ApexActor, actual: any) {
    let val : any = {}
    //values are stored as arrays but only contain one element for our purposes 
    if (expected.name[0] != actual.name[0]) {
        val.name = expected.name 
    }
    if (expected.summary[0] != actual.summary[0]) {
        val.summary = expected.summary 
    }
    if (expected.icon?.[0]?.url != actual.icon?.[0]?.url) {
        if (expected.icon?.[0]?.url) {
            //update case
            val.icon = [{
                type: "Image",
                url: expected.icon[0].url,
            }]
        } else {
            //delete case 
            val.icon = null
        }
    }
    if (Object.keys(val).length > 0) {
        val.id = actual.id 
        return val 
    } else {
        return null 
    }
}

/**
 * Throws if the provided config file is invalid, and logs warning to console
 * if possible issues are found.
 */
function checkConfigValid(file: ConfigFile) {
    const serviceIds = new Set<string>()
    const serviceIdsWithFeeds = new Set<string>()
    for (let service of file.services) {
        if (serviceIds.has(service.identifier)) {
            throw new Error("service ID " + service.identifier + " appears more than once")
        }
        serviceIds.add(service.identifier)
    }
    for (let feed of file.feeds) {
        for (let s of feed.relatesTo) {
            const id = typeof s == "string" ? s : s.identifier
            if (!serviceIds.has(id)) {
                throw new Error("feed URL " + feed.url + " relates to service ID " + id + ", which does not exist")
            }
            serviceIdsWithFeeds.add(id)
        }
        if (feed.relatesTo.length == 0) {
            console.warn("feed URL " + feed.url + " does not relate to any feeds")
        }
    }
    if (serviceIds.size != serviceIdsWithFeeds.size) {
        const servicesWithNoFeeds = Array.from(serviceIds).filter(s => !serviceIdsWithFeeds.has(s))
        console.warn(`service(s) ${servicesWithNoFeeds.join(',')} do(es) not have related feeds`)
    }
}