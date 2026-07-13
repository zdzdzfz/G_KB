import { createApp } from './app.js'
import { config } from './config.js'

const app = await createApp()

app.listen(config.port, '127.0.0.1', () => {
  console.log(`MailAuth Monitor Express API running on http://127.0.0.1:${config.port}`)
})
