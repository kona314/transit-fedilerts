
declare module 'activitypub-express' {
    import { Db } from "mongodb"
    interface AnyArgs {
        [key:string] : any 
    }
    interface ApexConsts {
        /** `[
            'https://www.w3.org/ns/activitystreams',
            'https://w3id.org/security/v1'
        ]` */
        ASContext: string[],
        /** `'application/x-www-form-urlencoded'` */
        formUrlType: string,
        /** `[
            // req.accepts uses accepts which does match profile
            'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
            'application/activity+json',
            // req.is uses type-is which cannot handle profile
            'application/ld+json'
        ]` */
        jsonldTypes: string[],
        // type-is is not able to match this pattern
        /** `'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'` */
        jsonldOutgoingType: string,
        // since we use json-ld procedding, it will always appear this way regardless of input format
        /** 'as:Public' */
        publicAddress: string,
    }
    interface ApexParams {
        name : string 
        version : string 
        baseUrl : string 
        context? : any 
        store? : any 
        actorParam : string 
        activityParam : string 
        collectionParam? : string 
        objectParam : string 
        pageParam?: string 
        itemsPerPage : number 
        threadDepth? : number 
        systemUser? : any 
        logger? : any 
        offlineMode? : boolean 
        requestTimeout? : number 
        routes: ApexRoutes 
        endpoints? : AnyArgs
    }
    interface ApexRoutes extends AnyArgs { 
        actor: string,
        object: string,
        activity: string,
        inbox: string,
        outbox: string,
        followers: string,
        following: string,
        liked: string,
        collections: string,
        blocked: string,
        rejections: string,
        rejected: string,
        shares: string,
        likes: string,
    }
    
    interface ApexActor extends AnyArgs {

    }
    type CreateApexActor = (username: string, displayName: string, summary: string, icon: any, type?: string) => Promise<ApexActor>

    interface ApexNet extends AnyArgs {
        webfinger: {
            respondNodeInfo: any, 
            respondNodeInfoLocation: any, 
            parseWebfinger: any, 
            respondWebfinger: any,
            get: any[],
        }
    }

    interface ApexStore extends AnyArgs {
        db : Db
        updateObject : (obj: any, actorId: string, fullReplace: boolean) => Promise<any>,
        saveObject : (obj: any) => Promise<any>,
    }

    type ActivityPubExpress = {
        (req: Express.Request, res: Express.Response) : any, 
        consts : ApexConsts,
        net : ApexNet,
        store : ApexStore, 
        utils : any,
        acceptFollow : (actor: any, activity: any) => Promise<any>,
        addToOutbox : (actor: any, activity: any) => Promise<any>,
        audienceFromActivity: (activity: any) => string[],
        buildActivity : (type: string, actorId: string, to: any, etc: any | undefined) => Promise<any>,
        createActor : CreateApexActor,
        publishUndoUpdate: (colId: string, actor: ApexActor, audience: string[]) => Promise<any>,
        toJSONLD: (obj: any) => any,
    }


    export default function init(params: ApexParams) : ActivityPubExpress
}