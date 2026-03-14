import { buildApp } from './app'

const start = async () => {
    try {
        const server = await buildApp()
        const port = parseInt(process.env.PORT || '8000', 10)
        
        await server.listen({ port, host: '0.0.0.0' })
        console.log(`Server listening on port ${port}`)

        const closeServer = async () => {
            await server.close()
            process.exit(0)
        }
        process.on('SIGINT', closeServer)
        process.on('SIGTERM', closeServer)
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

start()
