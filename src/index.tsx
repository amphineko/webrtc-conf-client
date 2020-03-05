import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import 'webrtc-adapter'

import { getLogger, setDebug } from './log'

import { AppMain } from './app'
import { GatewayClient } from './session/gateway'
import { MeetingSetup } from './setup/setup'
import { UserConfiguration } from './setup/user_config'

const log = getLogger('loader')

interface AppConfiguration {
    debug: boolean

    defaultGateway: string
}

function AppIndex(props: {
    config: AppConfiguration
}) {
    const { config: appConfig } = props

    const [userConfig, setUserConfig] = useState<UserConfiguration>({
        displayName: '',
        gateway: appConfig.defaultGateway,
        // sessionId: newUuid(),
        sessionId: '6db9e994-c098-429a-9a71-954edd4809b4',

        useAudio: true,
        useVideo: true,
    })
    const [isSetupScene, setSetupScene] = useState(true)

    const [audioTrack, setAudioTrack] = useState<MediaStreamTrack>(null)
    const [videoTrack, setVideoTrack] = useState<MediaStreamTrack>(null)

    const remoteTracks = useRef(new Map<string, Set<MediaStreamTrack>>())
    const [, refresh] = useState()

    const gateway = useRef<GatewayClient>(null)
    const logger = getLogger('AppIndex')

    async function applyUserConfig(newConfig: UserConfiguration) {
        setUserConfig(newConfig)
        setSetupScene(false)

        if (gateway.current !== null) {
            await gateway.current.stop()
            gateway.current = null
        }

        let rtcAudioTrack = audioTrack
        let rtcVideoTrack = videoTrack
        if (newConfig.useAudio || newConfig.useVideo) {
            const media = await navigator.mediaDevices.getUserMedia({
                audio: newConfig.useAudio,
                video: newConfig.useVideo,
            })

            remoteTracks.current.set('local', new Set(media.getTracks()))
            refresh(Math.random())

            const audioTracks = media.getAudioTracks()
            if (audioTracks.length === 0) {
                // TODO: more user notification
                logger.warn('No audio tracks provided')
                setUserConfig({ useAudio: false } as UserConfiguration)
            } else {
                rtcAudioTrack = audioTracks.shift()
                setAudioTrack(rtcAudioTrack)
                audioTracks.forEach((track) => track.stop()) // stop additional tracks
            }

            const videoTracks = media.getVideoTracks()
            if (videoTracks.length === 0) {
                // TODO: more user notification
                logger.warn('No video tracks provided')
                setUserConfig({ useVideo: false } as UserConfiguration)
            } else {
                rtcVideoTrack = videoTracks.shift()
                setVideoTrack(rtcVideoTrack)
                videoTracks.forEach((track) => track.stop()) // stop additional tracks
            }
        }

        const url = `http://${userConfig.gateway}/api/v1/gateway`
        gateway.current = new GatewayClient(url, {
            audio: rtcAudioTrack,
            video: rtcVideoTrack,
        })
        gateway.current.onconnected = () => logger.info(`Connected to Gateway: ${url}`)
        gateway.current.ondisconnected = () => logger.info('Disconnected from Gateway')

        gateway.current.ontrack = (id, track) => {
            if (!remoteTracks.current.has(id)) { remoteTracks.current.set(id, new Set()) }

            const tracks = remoteTracks.current.get(id)
            tracks.add(track)

            track.addEventListener('ended', () => {
                tracks.delete(track)
                refresh(Math.random())
            })

            refresh(Math.random())
        }

        await gateway.current.start()
        await gateway.current.join(newConfig.sessionId)
    }

    if (isSetupScene) {
        return (
            <MeetingSetup
                firstTime={userConfig === null}
                oldConfig={userConfig}
                onApplyNewConfig={applyUserConfig}
            />
        )
    }

    return <AppMain tracks={remoteTracks.current} />
}

function getLocalConfiguration(): Promise<AppConfiguration> {
    return new Promise((resolve) => {
        (window as any).setConfiguration = (config) => resolve(config)

        const script = document.createElement('script')
        script.src = 'config.js'

        const body = document.getElementsByTagName('body')[0]
        body.appendChild(script)
    })
}

async function getConfiguration() {
    const file = await fetch('config.json')
    return file.json<AppConfiguration>()
}

async function init() {
    log.debug('Begin Early Initialization: Fetch Configuration')
    const config = window.location.protocol.toLowerCase() === 'file:'
        ? await getLocalConfiguration()
        : await getConfiguration()
    setDebug(config.debug)

    log.debug('Begin Early Initialization: Invoke Render(AppIndex)')
    ReactDOM.render((
        <React.StrictMode>
            <AppIndex config={config} />
        </React.StrictMode>
    ), document.getElementById('app-main'))

    log.debug('End Early Initialization :)')
}

init().catch((error) => {
    log.error(`Early Initialization Failed: ${error}`)
})
