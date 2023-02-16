import {ActivityPubExpress, ApexActor} from 'activitypub-express'
import ConfigFile from '../models/config'

export default async function syncServicesFromConfigFile(file: ConfigFile, apex: ActivityPubExpress) {
    checkConfigValid(file)
    //return promises for updating/creating services as desired
    return Promise.all(
        file.services.map(service => {
            const icon = service.iconUrl ? {type: "Image", url: service.iconUrl} : null 
            if (icon?.url.startsWith("/")) {
                icon.url = "https://" + process.env.DOMAIN + "/f" + icon.url
            }
            return apex.createActor(service.identifier, service.displayName ?? (service.name + " Alerts"), "Automated service alerts for " + service.name, icon)
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
                    const updated = await apex.store.updateObject(changes, a.actor.id, false)
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
    const serviceIds = new Set()
    for (let service of file.services) {
        if (serviceIds.has(service.identifier)) {
            throw new Error("service ID " + service.identifier + " appears more than once")
        }
        serviceIds.add(service.identifier)
    }
    for (let feed of file.feeds) {
        for (let s of feed.relatesTo) {
            if (!serviceIds.has(s)) {
                throw new Error("feed URL " + feed.url + " relates to service ID " + s + ", which does not exist")
            }
        }
        if (feed.relatesTo.length == 0) {
            console.warn("feed URL " + feed.url + " does not relate to any feeds")
        }
    }
}