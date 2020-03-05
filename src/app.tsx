import React, { useEffect, useRef } from 'react'

import './app.css'

interface WindowProp {
    audio: MediaStreamTrack,
    id: string,
    video: MediaStreamTrack,
}

function RemoteWindow(props: { remoteId: string, stream: MediaStream }) {
    const { remoteId: id, stream } = props

    const videoElement = useRef<HTMLVideoElement>()

    useEffect(() => {
        videoElement.current.autoplay = true
        videoElement.current.srcObject = stream
    })

    return (
        <div className="remote-participant">
            <span className="id">{id}</span>
            <video ref={videoElement} muted />
        </div>
    )
}

export function AppMain(props: { tracks: Map<string, Set<MediaStreamTrack>> }) {
    const { tracks: trackCollection } = props

    const windows: object[] = []
    trackCollection.forEach((tracks, id) => {
        const stream = new MediaStream(Array.from(tracks.values()))
        windows.push(<RemoteWindow key={id as string} remoteId={id} stream={stream} />)
    })

    return (
        <div>
            {windows}
        </div>
    )
}
