
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import FileExplorer from '@/components/files/FileExplorer'
import { getUserFiles } from '@/lib/services/file-service'

export default async function MyFilesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const files = await getUserFiles(user.id)

    return <FileExplorer initialData={files} />
}
