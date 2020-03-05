import React, { useState } from 'react'

import 'bootstrap'
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css'

import { UserConfiguration } from './user_config'

import './setup.css'

export function MeetingSetup(props: {
    firstTime: boolean,
    oldConfig: UserConfiguration,
    onApplyNewConfig: (newConfig: UserConfiguration) => void
}) {
    const { firstTime, oldConfig, onApplyNewConfig: applyCallback } = props

    const [displayName, setDisplayName] = useState(oldConfig.displayName)
    const [gateway, setGateway] = useState(oldConfig.gateway)
    const [sessionId, setSessionId] = useState(oldConfig.sessionId)
    const [useAudio, setUseAudio] = useState(oldConfig.useAudio)
    const [useVideo, setUseVideo] = useState(oldConfig.useVideo)

    if (applyCallback === null) { throw new Error() }

    function applyConfig() {
        applyCallback({
            displayName: displayName,
            gateway: gateway,
            sessionId: sessionId,
            useAudio: useAudio,
            useVideo: useVideo,
        })
    }

    return (
        <div className="setup-form">
            <h1 className="h3 mb-3 font-weight-normal">Session Setup</h1>

            {firstTime && (
                <div className="alert alert-warning" role="alert">
                    Following fields are required to establish your session.
                </div>
            )}

            <form>
                <div className="form-group">
                    <label htmlFor="user-config-displayName">Display name</label>
                    <input
                        className="form-control"
                        id="user-config-displayName"
                        onChange={(event) => setDisplayName(event.target.value)}
                        value={displayName}
                    />
                    <small className="form-text text-muted">
                        This name will show to everyone else as your identity.
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="user-config-displayName">Session Id</label>
                    <input
                        className="form-control"
                        id="user-config-sessionId"
                        placeholder="123e4567-e89b-12d3-a456-426655440000"
                        onChange={(event) => setSessionId(event.target.value)}
                        value={sessionId}
                    />
                    <small className="form-text text-muted">
                        An unique string to identify your session.
                        <br />
                        Paste the id shared by others to join their sessions.
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="user-config-displayName">Gateway Url</label>
                    <div className="input-group">
                        <div className="input-group-prepend">
                            <span className="input-group-text">ws://</span>
                        </div>
                        <input
                            className="form-control"
                            id="user-config-gateway"
                            placeholder="example.com"
                            onChange={(event) => setGateway(event.target.value)}
                            value={gateway}
                        />
                        <div className="input-group-append">
                            <span className="input-group-text">/api/v1/gateway</span>
                        </div>
                    </div>
                    <small className="form-text text-muted">
                        The server that hosts your session.
                    </small>
                </div>

                <div className="form-group">
                    <div className="custom-control custom-checkbox">
                        <input
                            className="custom-control-input"
                            type="checkbox"
                            id="user-config-useVideo"

                            checked={useVideo}
                            onChange={(event) => setUseVideo(event.target.checked)}
                        />
                        <label className="custom-control-label" htmlFor="user-config-useVideo">Use my camera and enable video</label>
                    </div>

                    <div className="custom-control custom-checkbox">
                        <input
                            className="custom-control-input"
                            type="checkbox"
                            id="user-config-useAudio"

                            checked={useAudio}
                            onChange={(event) => setUseAudio(event.target.checked)}
                        />
                        <label className="custom-control-label" htmlFor="user-config-useAudio">Use my microphone and enable audio</label>
                    </div>
                </div>

                <button type="button" className="btn btn-primary btn-block" onClick={() => applyConfig()}>
                    Save
                </button>
            </form>
        </div>
    )
}
