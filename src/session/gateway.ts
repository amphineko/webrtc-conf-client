import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr'
import { Logger } from 'loglevel'

import { getLogger } from '../log'

export interface Participant {

}

export class GatewayClient {
    public onconnected: () => void

    public ondisconnected: () => void

    private logger: Logger

    private client: HubConnection

    private sessionId: string

    public constructor(url: string) {
        this.logger = getLogger('GatewayClient')
        this.sessionId = null

        this.client = new HubConnectionBuilder()
            .withAutomaticReconnect()
            .withUrl(url)
            .build()

        this.client.onreconnected = this.onconnected
        this.client.onreconnecting = this.ondisconnected

        this.client.on('OnParticipantIceCandidate', (origin, payload) => this.onIceCandidate(origin, payload))
        this.client.on('OnParticipantJoin', (id, description) => this.onJoin(id, description))
        this.client.on('OnParticipantLeave', (id) => this.onLeave(id))
        this.client.on('OnParticipantRtcAnswer', (origin, sdp) => this.onRtcAnswer(origin, sdp))
        this.client.on('OnParticipantRtcOffer', (origin, sdp) => this.onRtcOffer(origin, sdp))
    }

    public async join(id: string) {
        if (this.sessionId !== null) { await this.leave() }

        this.sessionId = id
        await this.client.invoke('JoinSession', id)
    }

    public async leave() {
        this.client.invoke('LeaveCurrentSession')
    }

    public async start() {
        await this.client.start().then(() => this.onconnected())
    }

    public async stop() {
        await this.client.stop().then(() => this.ondisconnected())
    }

    private onIceCandidate(origin: string, payload: string) {
        this.logger.debug(`Received Ice Candidate from ${origin}: ${payload}`)
        throw new Error('Not implemented')
    }

    private onJoin(id: string, description: Participant): void {
        this.logger.info(`Participant ${id} joined session.`)
    }

    private onLeave(id: string): void {
        this.logger.info(`Participant ${id} left session.`)
    }

    private onRtcAnswer(origin: string, sdp: string) {
        this.logger.debug(`Received Rtc Answer from ${origin}: ${sdp}`)
        throw new Error('Not implemented')
    }

    private onRtcOffer(origin: string, sdp: string) {
        this.logger.debug(`Received Rtc Offer from ${origin}: ${sdp}`)
        throw new Error('Not implemented')
    }
}
