import {ActivityPubExpress, ApexActor} from 'activitypub-express'
import ConfigFile from '../models/config'

export default async function syncFeedsFromConfigFile(file: ConfigFile, apex: ActivityPubExpress) {
    return Promise.all(
        file.services.map(feed => apex.createActor(feed.identifier, feed.displayName ?? (feed.serviceName + " Alerts"), "Automated service alerts for " + feed.serviceName, null))
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
        // TODO: Outbox message announcing changes
        return Promise.all(data.map(a => {
            if (a.existingObject != null) {
                const changes = updatedFeedValues(a.actor, a.existingObject)
                if (changes) {
                    return apex.store.updateObject(changes, a.actor.id, false)
                } else {
                    return Promise.resolve()
                }
            } else {
                return apex.store.saveObject(a.actor)
            }
        }))
    })
}

function updatedFeedValues(expected: ApexActor, actual: any) {
    let val : any = {}
    //values are stored as arrays but only contain one element for our purposes 
    if (expected.name[0] != actual.name[0]) {
        val.name = expected.name 
    }
    if (expected.summary[0] != actual.summary[0]) {
        val.summary = expected.summary 
    }
    if (Object.keys(val).length > 0) {
        val.id = actual.id 
        return val 
    } else {
        return null 
    }
}