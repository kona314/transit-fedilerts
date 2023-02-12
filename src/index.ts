import * as dotenv from 'dotenv' 
dotenv.config()
import express from 'express'
import syncFeedsFromConfigFile from './gtfsrt/syncFeeds'
import { MongoClient } from 'mongodb'
import ActivityPubExpress, { ApexRoutes } from 'activitypub-express'
import parseConfig from './gtfsrt/parseConfig'
import getJobs from './gtfsrt/getJobs'
import { ToadScheduler } from 'toad-scheduler'
import http from 'http'
import https from 'https'
import fs from 'fs'

const app = express()
const port = process.env.PORT ?? 8080

const routes: ApexRoutes = {
    actor: '/u/:actor',
    object: '/o/:id',
    activity: '/s/:id',
    inbox: '/u/:actor/inbox',
    outbox: '/u/:actor/outbox',
    followers: '/u/:actor/followers',
    following: '/u/:actor/following',
    liked: '/u/:actor/liked',
    collections: '/u/:actor/c/:id',
    blocked: '/u/:actor/blocked',
    rejections: '/u/:actor/rejections',
    rejected: '/u/:actor/rejected',
    shares: '/s/:id/shares',
    likes: '/s/:id/likes'
}
const apex = ActivityPubExpress({
    name: 'Transit Fedilerts',
    version: '0.1.0',
    baseUrl: "https://" + process.env.DOMAIN ?? "",
    actorParam: 'actor',
    objectParam: 'id',
    activityParam: 'id',
    itemsPerPage: 100,
    routes,
    // delivery done in workers only in production
    offlineMode: process.env.NODE_ENV === 'production',
})

const client = new MongoClient(process.env.MONGO_URI ?? 'mongodb://localhost:27017')

app.use(
    express.json({ type: apex.consts.jsonldTypes }),
    express.urlencoded({ extended: true }),
    apex
)
// define routes using prepacakged middleware collections
app.route(routes.inbox)
    .get(apex.net.inbox.get)
    .post(apex.net.inbox.post)
app.route(routes.outbox)
    .get((_req:any, _res:any, next:any) => {
        console.log()
        next()
    })
    .get(apex.net.outbox.get)
    .post(apex.net.outbox.post)
app.get(routes.actor, apex.net.actor.get)
app.get(routes.followers, apex.net.followers.get)
app.get(routes.following, apex.net.following.get)
app.get(routes.liked, apex.net.liked.get)
app.get(routes.object, apex.net.object.get)
app.get(routes.activity, apex.net.activityStream.get)
app.get(routes.shares, apex.net.shares.get)
app.get(routes.likes, apex.net.likes.get)
app.get('/.well-known/webfinger', apex.net.webfinger.get)
app.get('/.well-known/nodeinfo', apex.net.nodeInfoLocation.get)
app.get('/nodeinfo/:version', apex.net.nodeInfo.get)

app.on('apex-outbox', (msg: any) => {
    console.log(`[OUTBOX] New ${msg.object.type} from ${msg.actor}`)
})
app.on('apex-inbox', async (msg: any) => {
    console.log(`New ${msg.object.type} from ${msg.actor.id} to ${msg.recipient.id}`)
    const {activity, recipient, actor} = msg 
    switch (activity.type.toLowerCase()) {
        // automatically accept follow requests
        // clutters outbox--need a way to adjust post count
        case 'follow': {
            const accept = await apex.buildActivity('Accept', recipient.id, actor.id, {
                object: activity.id
            })
            const { postTask: publishUpdatedFollowers } = await apex.acceptFollow(recipient, activity)
            await apex.addToOutbox(recipient, accept)
            return publishUpdatedFollowers()
        }
    }
})

app.get('/stats', async (req, res, next) => {
    try {
        const queueSize = await apex.store.db.collection('deliveryQueue')
            .countDocuments({ attempt: 0 })
        const uptime = process.uptime()
        res.json({ queueSize, uptime })
    } catch (err) {
        next(err)
    }
})

//shamlessly copied from gup.pe implementation: will likely need to adjust with time
app.get('/fedilerts/services', async (req, res) => {
    apex.store.db.collection('streams')
    .aggregate([
        { $sort: { _id: -1 } }, // start from most recent
        { $limit: 10000 }, // don't traverse the entire history
        { $match: { type: 'Create' } },
        { $group: { _id: '$actor', postCount: { $sum: 1 } } },
        { $lookup: { from: 'objects', localField: '_id', foreignField: 'id', as: 'actor' } },
        // merge joined actor up
        { $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: ['$actor', 0] }, '$$ROOT'] } } },
        { $project: { _id: 0, _meta: 0, actor: 0 } }
    ])
    .sort({ postCount: -1 })
    .toArray()
    .then(groups => apex.toJSONLD({
        id: `https://${process.env.DOMAIN}/fedilerts/services`,
        type: 'OrderedCollection',
        totalItems: groups.length,
        orderedItems: groups
    }))
    .then(groups => res.json(groups))
    .catch(err => {
        console.log(err.message)
        return res.status(500).send()
    })
})

const scheduler = new ToadScheduler()

client.connect()
    .then(() => {
        apex.store.db = client.db(process.env.MONGO_DB_NAME ?? 'transitFedilerts')
        return apex.store.setup()
    })
    .then(() => parseConfig())
    .then((file) => {
        return Promise.all([
            syncFeedsFromConfigFile(file, apex),
            getJobs(file.services, apex, client),
        ])
    })
    .then(([_v, jobs]) => jobs.forEach(j => scheduler.addIntervalJob(j)))
    .then(() => {
        if (process.env.NODE_ENV === "production") {
            const server = http.createServer(app)
            server.listen(port, () => console.log(`Transit Fedilerts listening on port ${port}`))
        } else {
            const server = https.createServer({
                key: process.env.SSL_KEY && fs.readFileSync(process.env.SSL_KEY),
                cert: process.env.SSL_CERT && fs.readFileSync(process.env.SSL_CERT),
            }, app)
            server.listen(port, () => console.log(`Transit Fedilerts listening on port ${port}`))
        }
    })
    .catch(console.error)
