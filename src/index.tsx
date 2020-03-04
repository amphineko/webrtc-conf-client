import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import newUuid from 'uuid/v4'

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
        sessionId: newUuid(),
    })
    const [isSetupScene, setSetupScene] = useState(true)

    const gateway = useRef<GatewayClient>(null)
    const logger = getLogger('AppIndex')

    async function applyUserConfig(newConfig: UserConfiguration) {
        setUserConfig(newConfig)
        setSetupScene(false)

        if (gateway.current !== null) {
            await gateway.current.stop()
            gateway.current = null
        }

        const url = `http://${userConfig.gateway}/api/v1/gateway`
        gateway.current = new GatewayClient(url)
        gateway.current.onconnected = () => logger.info(`Connected to Gateway: ${url}`)
        gateway.current.ondisconnected = () => logger.info('Disconnected from Gateway')
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

    return <AppMain />
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
