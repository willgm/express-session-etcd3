import * as session from 'express-session'
import { Etcd3, IOptions } from 'etcd3'

const oneDay = 86400

export interface Etcd3StoreOptions extends IOptions {
  prefix?: string
}

export const defaultOptions: Etcd3StoreOptions = Object.freeze({
  prefix: 'sess',
  hosts: '127.0.0.1:2379'
})

export default class Etcd3Store extends session.Store {
  constructor(
    private config: Etcd3StoreOptions = defaultOptions,
    private client = new Etcd3(config)
  ) {
    super(config)
  }

  get = (sid: string, callback: (err: any, session: Express.SessionData) => void): void => {
    try {
      this.client
        .get(this.key(sid))
        .json()
        .then((val: any) => callback(null, val))
        .catch(err => callback(err, null as any))
    } catch (err) {
      callback(err, null as any)
    }
  }

  set = (sid: string, session: Express.Session, callback: (err: any) => void): void => {
    try {
      this.client
        .lease(this.getTTL(session, sid))
        .put(this.key(sid))
        .value(JSON.stringify(session))
        .catch(callback)
    } catch (err) {
      callback(err)
    }
  }

  touch = (sid: string, session: Express.Session, callback: (err: any) => void): void => {
    try {
      this.client
        .lease(this.getTTL(session, sid))
        .put(this.key(sid))
        .touch()
        .catch(callback)
    } catch (err) {
      callback(err)
    }
  }

  all = (callback: (err: any, obj: { [sid: string]: Express.SessionData }) => void): void => {
    try {
      this.client
        .getAll()
        .prefix(this.key())
        .json()
        .then((val: any) => callback(null, val))
        .catch(err => callback(err, null as any))
    } catch (err) {
      callback(err, null as any)
    }
  }

  length = (callback: (err: any, length: number) => void): void => {
    try {
      this.client
        .getAll()
        .prefix(this.key())
        .count()
        .then(val => callback(null, val))
        .catch(err => callback(err, null as any))
    } catch (err) {
      callback(err, null as any)
    }
  }

  destroy = (sid: string, callback: (err: any) => void): void => {
    try {
      this.client
        .delete()
        .prefix(this.key(sid))
        .catch(callback)
    } catch (err) {
      callback(err)
    }
  }

  clear = (callback: (err: any) => void): void => {
    try {
      this.client
        .delete()
        .prefix(this.key())
        .catch(callback)
    } catch (err) {
      callback(err)
    }
  }

  private key(sid = ''): string {
    return (this.config.prefix || defaultOptions.prefix) + '/' + sid
  }

  private getTTL(sess: Express.SessionData, sid: string): number {
    const storeTtl: any = (this as any)['ttl']
    if (typeof storeTtl === 'number') return storeTtl
    if (typeof storeTtl === 'string') return Number(storeTtl)
    if (typeof storeTtl === 'function') return storeTtl(this, sess, sid)
    if (storeTtl) throw new TypeError('`storeTtl` must be a number or function.')

    const maxAge = sess.cookie.maxAge
    return typeof maxAge === 'number' ? Math.floor(maxAge / 1000) : oneDay
  }
}