import { Hono } from 'hono'
import aiEdit from './ai-edit'
import transactions from './transactions'
import usersOverview from './users-overview'

const admin = new Hono()
admin.route('/ai-edit', aiEdit)
admin.route('/transactions', transactions)
admin.route('/users/overview', usersOverview)
// Tambahkan route admin lain di sini

export default admin
