import { buildApp } from '../src/app'

export default async (req: any, res: any) => {
    const app = await buildApp()
    await app.ready()
    app.server.emit('request', req, res)
}
