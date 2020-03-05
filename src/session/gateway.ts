import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr'
import { Logger } from 'loglevel'

import { getLogger } from '../log'

export interface Participant {

}

interface MediaTracks { audio: MediaStreamTrack, video: MediaStreamTrack }

export class RtcConnection {
    public ontrack: (track: MediaStreamTrack) => void

    private client: HubConnection

    private conn: RTCPeerConnection

    private logger: Logger

    private remoteId: string

    private tracks: MediaTracks

    public constructor(remoteId: string, client: HubConnection, tracks: MediaTracks) {
        this.remoteId = remoteId
        this.client = client
        this.tracks = tracks

        this.logger = getLogger('RtcConnection')

        const conn = new RTCPeerConnection()

        conn.onicecandidate = (event) => {
            if (event.candidate) { this.client.invoke('SendIceCandidate', remoteId, JSON.stringify(event.candidate)) }
        }

        conn.onnegotiationneeded = async () => {
            if (conn.signalingState !== 'stable') { return }

            await this.negotiate()
        }

        conn.onconnectionstatechange = () => {
            this.logger.info(`Peer ${remoteId} Connection: ${conn.connectionState}`)

            if (conn.connectionState === 'connected') {
                if (this.tracks.audio) { this.conn.addTrack(this.tracks.audio) }
                if (this.tracks.video) { this.conn.addTrack(this.tracks.video) }
            }
        }
        conn.oniceconnectionstatechange = () => this.logger.info(`Peer ${remoteId} Ice Connection: ${conn.iceConnectionState}`)
        conn.onicegatheringstatechange = () => this.logger.info(`Peer ${remoteId} Ice Gathering: ${conn.iceGatheringState}`)
        conn.onsignalingstatechange = () => this.logger.info(`Peer ${remoteId} Signaling: ${conn.signalingState}`)

        conn.ontrack = (event) => {
            this.logger.info(`Received ${event} track from ${remoteId}`)
        }

        this.conn = conn
    }

    public async close() {
        this.conn.close()
    }

    public async handleAnswer(answer: string) {
        this.logger.debug(`${this.remoteId}: Rtc Answer`)

        await this.conn.setRemoteDescription(JSON.parse(answer))
    }

    public async handleIceCandidate(candidate: string) {
        this.logger.debug(`${this.remoteId}: Ice Candidate`)

        await this.conn.addIceCandidate(JSON.parse(candidate))
    }

    public async handleOffer(offer: string) {
        this.logger.debug(`${this.remoteId}: Rtc Offer`)

        await this.conn.setRemoteDescription(JSON.parse(offer))
        const answer = await this.conn.createAnswer({
            offerToReceiveAudio: this.tracks.audio && true,
            offerToReceiveVideo: this.tracks.video && true,
        })
        await this.conn.setLocalDescription(answer)
        await this.client.invoke('SendRtcAnswer', this.remoteId, JSON.stringify(answer))

        this.logger.debug(`Sent Rtc Answer to ${this.remoteId}`)
    }

    public async negotiate() {
        const offer = await this.conn.createOffer({
            offerToReceiveAudio: this.tracks.audio && true,
            offerToReceiveVideo: this.tracks.video && true,
        })
        await this.conn.setLocalDescription(offer)
        await this.client.invoke('SendRtcOffer', this.remoteId, JSON.stringify(offer))

        this.logger.debug(`Sent Rtc Offer to ${this.remoteId}`)
    }
}

export class GatewayClient {
    public onconnected: () => void

    public ondisconnected: () => void

    public ontrack: (id: string, track: MediaStreamTrack) => void

    private readonly client: HubConnection

    private clientId: string

    private readonly connections: Map<string, RtcConnection>

    private readonly logger: Logger

    private sessionId: string

    private tracks: MediaTracks

    public constructor(url: string, tracks: MediaTracks) {
        this.tracks = tracks

        this.connections = new Map()
        this.logger = getLogger('GatewayClient')
        this.sessionId = null

        this.client = new HubConnectionBuilder()
            .withAutomaticReconnect()
            .withUrl(url)
            .build()

        this.client.onreconnected = this.onconnected
        this.client.onreconnecting = this.ondisconnected

        this.client.on('OnParticipantIceCandidate', async (origin, payload) => {
            await this.connections.get(origin).handleIceCandidate(payload)
        })
        this.client.on('OnParticipantRtcAnswer', async (origin, payload) => {
            await this.connections.get(origin).handleAnswer(payload)
        })
        this.client.on('OnParticipantRtcOffer', async (origin, payload) => {
            if (!this.connections.has(origin)) {
                this.addConnection(origin, true)
            }

            await this.connections.get(origin).handleOffer(payload)
        })

        this.client.on('OnParticipantJoin', (id) => this.onJoin(id))
        this.client.on('OnParticipantLeave', (id) => this.onLeave(id))
    }

    public async join(id: string) {
        if (this.sessionId !== null) { await this.leave() }

        this.sessionId = id
        await this.client.invoke('JoinSession', id)

        this.logger.info(`Joined session ${id}`)
    }

    public async leave() {
        this.client.invoke('LeaveCurrentSession')
    }

    public async start() {
        await this.client.start().then(() => this.onconnected())
        this.clientId = await this.client.invoke('GetParticipantId')
        this.logger.info(`Local participant Id: ${this.clientId}`)
    }

    public async stop() {
        await this.client.stop().then(() => this.ondisconnected())
    }

    private async addConnection(id: string, passive: boolean) {
        if (this.connections.has(id)) { this.connections.get(id).close() }

        const conn = new RtcConnection(id, this.client, this.tracks)
        this.connections.set(id, conn)
        if (!passive) { await conn.negotiate() }
    }

    private async onLeave(id: string) {
        this.logger.info(`Participant ${id} left`)

        const conn = this.connections.get(id)
        if (conn) { await conn.close() }

        this.connections.delete(id)
    }

    private async onJoin(id: string) {
        this.logger.info(`Participant ${id} joined`)

        await this.addConnection(id, false)
    }
}
