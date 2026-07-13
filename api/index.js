import { createApp } from '../backend/src/app.js'

let appPromise

export default async function handler(req, res) {
  appPromise ||= createApp()
  const app = await appPromise
  return app(req, res)
}
