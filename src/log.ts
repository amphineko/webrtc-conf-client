import loglevel from 'loglevel'

export function setDebug(value) {
    if (value) loglevel.enableAll()
}

export function getLogger(name) {
    return loglevel.getLogger(name)
}
